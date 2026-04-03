// Shared search logic — used by both API routes and the search runner

// ─── EBAY ────────────────────────────────────────────────────────────────────

interface EbayToken {
  access_token: string
  expires_at: number
}

let cachedToken: EbayToken | null = null

async function getEbayToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token
  }

  const clientId = process.env.EBAY_CLIENT_ID!
  const clientSecret = process.env.EBAY_CLIENT_SECRET!
  const isProduction = process.env.EBAY_ENV === 'production'

  const tokenUrl = isProduction
    ? 'https://api.ebay.com/identity/v1/oauth2/token'
    : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`eBay token error ${res.status}: ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.access_token
}

export interface SearchItem {
  title: string
  price: number
  currency: string
  imageUrl: string
  url: string
  condition: string
  seller: string
  itemId: string
}

export async function searchEbay(
  keywords: string[],
  minPrice?: number,
  maxPrice?: number
): Promise<{ items: SearchItem[]; total: number }> {
  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    throw new Error('eBay API credentials not configured')
  }

  const token = await getEbayToken()
  const isProduction = process.env.EBAY_ENV === 'production'
  const baseUrl = isProduction
    ? 'https://api.ebay.com/buy/browse/v1/item_summary/search'
    : 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'

  const userQuery = keywords.join(' ')
  const query = `(antique,vintage) ${userQuery}`

  const filters: string[] = [
    'deliveryCountry:GB',
    'itemLocationCountry:GB',
    'conditions:{USED|VERY_GOOD|GOOD|ACCEPTABLE}',
  ]
  if (minPrice != null && minPrice > 0) {
    filters.push(`price:[${minPrice}..${maxPrice ?? ''}],priceCurrency:GBP`)
  } else if (maxPrice != null && maxPrice > 0) {
    filters.push(`price:[..${maxPrice}],priceCurrency:GBP`)
  }

  const params = new URLSearchParams({
    q: query,
    category_ids: '10321',
    filter: filters.join(','),
    sort: 'newlyListed',
    limit: '50',
  })

  const res = await fetch(`${baseUrl}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
      'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country%3DGB',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`eBay API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const items: SearchItem[] = (data.itemSummaries ?? []).map((item: any) => ({
    title: item.title,
    price: parseFloat(item.price?.value ?? '0'),
    currency: item.price?.currency ?? 'GBP',
    imageUrl: item.thumbnailImages?.[0]?.imageUrl ?? item.image?.imageUrl ?? '',
    url: item.itemWebUrl,
    condition: item.condition ?? 'Not specified',
    seller: item.seller?.username ?? 'Unknown',
    itemId: item.itemId,
  }))

  return { items, total: data.total ?? items.length }
}

// ─── ETSY ────────────────────────────────────────────────────────────────────

export async function searchEtsy(
  keywords: string[],
  minPrice?: number,
  maxPrice?: number
): Promise<{ items: SearchItem[]; total: number }> {
  const apiKey = process.env.ETSY_API_KEY
  if (!apiKey) {
    throw new Error('Etsy API key not configured')
  }

  const query = keywords.join(' ')
  const params = new URLSearchParams({
    keywords: query,
    taxonomy_id: '1194',
    sort_on: 'created',
    sort_order: 'desc',
    limit: '50',
    shop_location: 'gb',
  })

  if (minPrice != null && minPrice > 0) params.set('min_price', String(minPrice))
  if (maxPrice != null && maxPrice > 0) params.set('max_price', String(maxPrice))

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/listings/active?${params}`,
    { headers: { 'x-api-key': apiKey } }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Etsy API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const results = data.results ?? []

  // Batch-fetch images
  const listingIds = results.map((r: any) => r.listing_id).join(',')
  let imageMap: Record<string, string> = {}
  if (listingIds) {
    try {
      const imgRes = await fetch(
        `https://openapi.etsy.com/v3/application/listings/batch?listing_ids=${listingIds}&includes=images`,
        { headers: { 'x-api-key': apiKey } }
      )
      if (imgRes.ok) {
        const imgData = await imgRes.json()
        for (const listing of imgData.results ?? []) {
          imageMap[listing.listing_id] = listing.images?.[0]?.url_570xN ?? ''
        }
      }
    } catch { /* images are nice-to-have */ }
  }

  const items: SearchItem[] = results.map((item: any) => ({
    title: item.title,
    price: parseFloat(item.price?.amount ?? '0') / (item.price?.divisor ?? 100),
    currency: item.price?.currency_code ?? 'GBP',
    imageUrl: imageMap[item.listing_id] ?? '',
    url: item.url,
    condition: item.when_made ?? 'Not specified',
    seller: item.shop_id ? `shop:${item.shop_id}` : 'Unknown',
    itemId: String(item.listing_id),
  }))

  return { items, total: data.count ?? items.length }
}

import { NextRequest, NextResponse } from 'next/server'

// eBay Browse API — search for antique jewellery listings
// Docs: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search

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

export interface EbayItem {
  title: string
  price: number
  currency: string
  imageUrl: string
  url: string
  condition: string
  seller: string
  itemId: string
}

export async function POST(req: NextRequest) {
  try {
    const { keywords, minPrice, maxPrice } = await req.json() as {
      keywords: string[]
      minPrice?: number
      maxPrice?: number
    }

    if (!keywords?.length) {
      return NextResponse.json({ error: 'keywords required' }, { status: 400 })
    }

    if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
      return NextResponse.json({ error: 'eBay API credentials not configured' }, { status: 500 })
    }

    const token = await getEbayToken()
    const isProduction = process.env.EBAY_ENV === 'production'
    const baseUrl = isProduction
      ? 'https://api.ebay.com/buy/browse/v1/item_summary/search'
      : 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'

    // Build query — combine keywords with OR for broader matching
    const query = keywords.join(' ')

    const params = new URLSearchParams({
      q: query,
      category_ids: '281',  // Jewellery & Watches
      filter: buildFilter(minPrice, maxPrice),
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
      console.error('eBay search error:', res.status, text)
      return NextResponse.json({ error: `eBay API error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const items: EbayItem[] = (data.itemSummaries ?? []).map((item: any) => ({
      title: item.title,
      price: parseFloat(item.price?.value ?? '0'),
      currency: item.price?.currency ?? 'GBP',
      imageUrl: item.thumbnailImages?.[0]?.imageUrl ?? item.image?.imageUrl ?? '',
      url: item.itemWebUrl,
      condition: item.condition ?? 'Not specified',
      seller: item.seller?.username ?? 'Unknown',
      itemId: item.itemId,
    }))

    return NextResponse.json({ items, total: data.total ?? items.length })
  } catch (err) {
    console.error('eBay search failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'eBay search failed' },
      { status: 500 }
    )
  }
}

function buildFilter(minPrice?: number, maxPrice?: number): string {
  const filters: string[] = [
    'deliveryCountry:GB',
    'itemLocationCountry:GB',
  ]

  if (minPrice != null && minPrice > 0) {
    filters.push(`price:[${minPrice}..${maxPrice ?? ''}],priceCurrency:GBP`)
  } else if (maxPrice != null && maxPrice > 0) {
    filters.push(`price:[..${maxPrice}],priceCurrency:GBP`)
  }

  return filters.join(',')
}

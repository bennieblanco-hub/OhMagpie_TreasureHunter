import { NextRequest, NextResponse } from 'next/server'

// Etsy Open API v3 — search for antique jewellery listings
// Docs: https://developers.etsy.com/documentation/reference/#operation/findAllListingsActive

export interface EtsyItem {
  title: string
  price: number
  currency: string
  imageUrl: string
  url: string
  condition: string
  seller: string
  listingId: string
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

    const apiKey = process.env.ETSY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Etsy API key not configured — add ETSY_API_KEY to .env.local' }, { status: 500 })
    }

    const query = keywords.join(' ')
    const params = new URLSearchParams({
      keywords: query,
      taxonomy_id: '1194',  // Jewellery
      sort_on: 'created',
      sort_order: 'desc',
      limit: '50',
    })

    if (minPrice != null && minPrice > 0) {
      params.set('min_price', String(minPrice))
    }
    if (maxPrice != null && maxPrice > 0) {
      params.set('max_price', String(maxPrice))
    }

    // Etsy prices are in the listing currency; filter to GBP shop_location
    params.set('shop_location', 'gb')

    const res = await fetch(
      `https://openapi.etsy.com/v3/application/listings/active?${params}`,
      {
        headers: { 'x-api-key': apiKey },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('Etsy search error:', res.status, text)
      return NextResponse.json({ error: `Etsy API error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const results = data.results ?? []

    // Fetch images for the listings (Etsy doesn't include images in search results)
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
            const img = listing.images?.[0]?.url_570xN ?? listing.images?.[0]?.url_75x75 ?? ''
            imageMap[listing.listing_id] = img
          }
        }
      } catch {
        // Images are nice-to-have, continue without them
      }
    }

    const items: EtsyItem[] = results.map((item: any) => ({
      title: item.title,
      price: parseFloat(item.price?.amount ?? '0') / (item.price?.divisor ?? 100),
      currency: item.price?.currency_code ?? 'GBP',
      imageUrl: imageMap[item.listing_id] ?? '',
      url: item.url,
      condition: item.when_made ?? 'Not specified',
      seller: item.shop_id ? `shop:${item.shop_id}` : 'Unknown',
      listingId: String(item.listing_id),
    }))

    return NextResponse.json({ items, total: data.count ?? items.length })
  } catch (err) {
    console.error('Etsy search failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Etsy search failed' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

// Run a single saved search — calls eBay and/or Etsy, deduplicates, inserts new finds

export async function POST(req: NextRequest) {
  try {
    const { searchId } = await req.json() as { searchId: number }
    if (!searchId) {
      return NextResponse.json({ error: 'searchId required' }, { status: 400 })
    }

    const sb = supabaseServer()

    // Fetch the saved search config
    const { data: search, error: searchErr } = await sb
      .from('searches')
      .select('*')
      .eq('id', searchId)
      .single()

    if (searchErr || !search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 })
    }

    const results = await runSearch(search)

    // Deduplicate against existing finds by URL
    const existingUrls = new Set<string>()
    if (results.length > 0) {
      const urls = results.map(r => r.url).filter(Boolean)
      const { data: existing } = await sb
        .from('finds')
        .select('url')
        .in('url', urls)

      for (const row of existing ?? []) {
        if (row.url) existingUrls.add(row.url)
      }
    }

    const newFinds = results.filter(r => r.url && !existingUrls.has(r.url))

    // Insert new finds
    if (newFinds.length > 0) {
      const rows = newFinds.map(f => ({
        title:       f.title,
        price:       f.price,
        platform:    f.platform,
        era:         'General',   // Will be classified later by AI scoring
        status:      'New',
        image_url:   f.imageUrl,
        url:         f.url,
        found_at:    new Date().toISOString(),
        search_name: search.name,
        description: f.condition,
        seller:      f.seller,
        condition:   f.condition,
      }))

      const { error: insertErr } = await sb.from('finds').insert(rows)
      if (insertErr) {
        console.error('Insert finds error:', insertErr)
      }
    }

    // Update search metadata
    await sb.from('searches').update({
      last_run: new Date().toISOString(),
      results_today: (search.results_today ?? 0) + newFinds.length,
    }).eq('id', searchId)

    return NextResponse.json({
      searched: results.length,
      new: newFinds.length,
      duplicates: results.length - newFinds.length,
    })
  } catch (err) {
    console.error('Search run failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search run failed' },
      { status: 500 }
    )
  }
}

interface SearchResult {
  title: string
  price: number
  platform: string
  imageUrl: string
  url: string
  condition: string
  seller: string
}

async function runSearch(search: any): Promise<SearchResult[]> {
  const platforms: string[] = search.platforms ?? []
  const keywords: string[] = search.keywords ?? []
  const minPrice = search.min_price
  const maxPrice = search.max_price

  const promises: Promise<SearchResult[]>[] = []

  if (platforms.includes('eBay')) {
    promises.push(searchEbay(keywords, minPrice, maxPrice))
  }
  if (platforms.includes('Etsy')) {
    promises.push(searchEtsy(keywords, minPrice, maxPrice))
  }

  const results = await Promise.allSettled(promises)
  const allItems: SearchResult[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value)
    } else {
      console.error('Platform search failed:', result.reason)
    }
  }

  return allItems
}

async function searchEbay(keywords: string[], minPrice?: number, maxPrice?: number): Promise<SearchResult[]> {
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const res = await fetch(`${origin}/api/ebay/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, minPrice, maxPrice }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`eBay search failed: ${text}`)
  }

  const { items } = await res.json()
  return (items ?? []).map((item: any) => ({
    title:     item.title,
    price:     item.price,
    platform:  'eBay',
    imageUrl:  item.imageUrl,
    url:       item.url,
    condition: item.condition,
    seller:    item.seller,
  }))
}

async function searchEtsy(keywords: string[], minPrice?: number, maxPrice?: number): Promise<SearchResult[]> {
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const res = await fetch(`${origin}/api/etsy/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, minPrice, maxPrice }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Etsy search failed: ${text}`)
  }

  const { items } = await res.json()
  return (items ?? []).map((item: any) => ({
    title:     item.title,
    price:     item.price,
    platform:  'Etsy',
    imageUrl:  item.imageUrl,
    url:       item.url,
    condition: item.condition,
    seller:    item.seller,
  }))
}

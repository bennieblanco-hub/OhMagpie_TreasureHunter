import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { searchEbay, searchEtsy, SearchItem } from '@/lib/search'

// Run a single saved search — calls eBay and/or Etsy directly, deduplicates, inserts new finds

export async function POST(req: NextRequest) {
  try {
    const { searchId } = await req.json() as { searchId: number }
    if (!searchId) {
      return NextResponse.json({ error: 'searchId required' }, { status: 400 })
    }

    const sb = supabaseServer()

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

    if (newFinds.length > 0) {
      const rows = newFinds.map(f => ({
        title:       f.title,
        price:       f.price,
        platform:    f.platform,
        era:         'General',
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
      if (insertErr) console.error('Insert finds error:', insertErr)
    }

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

interface RunResult {
  title: string
  price: number
  platform: string
  imageUrl: string
  url: string
  condition: string
  seller: string
}

async function runSearch(search: any): Promise<RunResult[]> {
  const platforms: string[] = search.platforms ?? []
  const keywords: string[] = search.keywords ?? []
  const minPrice = search.min_price
  const maxPrice = search.max_price
  const allItems: RunResult[] = []

  const promises: Promise<void>[] = []

  if (platforms.includes('eBay')) {
    promises.push(
      searchEbay(keywords, minPrice, maxPrice)
        .then(({ items }) => {
          for (const item of items) {
            allItems.push({ ...item, platform: 'eBay' })
          }
        })
        .catch(err => console.error('eBay search failed:', err))
    )
  }

  if (platforms.includes('Etsy')) {
    promises.push(
      searchEtsy(keywords, minPrice, maxPrice)
        .then(({ items }) => {
          for (const item of items) {
            allItems.push({ ...item, platform: 'Etsy' })
          }
        })
        .catch(err => console.error('Etsy search failed:', err))
    )
  }

  await Promise.allSettled(promises)
  return allItems
}

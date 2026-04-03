import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { searchEbay, searchEtsy } from '@/lib/search'

// Cron job: runs all active saved searches daily at 7am UTC
// Configured in vercel.json: "0 7 * * *"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = supabaseServer()

  // Reset daily counts
  await sb.from('searches').update({ results_today: 0 }).gt('results_today', 0)

  const { data: searches, error } = await sb
    .from('searches')
    .select('*')
    .eq('active', true)

  if (error || !searches?.length) {
    return NextResponse.json({ message: 'No active searches', error: error?.message })
  }

  const summary = []

  for (const search of searches) {
    try {
      const platforms: string[] = search.platforms ?? []
      const keywords: string[] = search.keywords ?? []
      const allItems: { title: string; price: number; platform: string; imageUrl: string; url: string; condition: string; seller: string }[] = []

      if (platforms.includes('eBay')) {
        try {
          const { items } = await searchEbay(keywords, search.min_price, search.max_price)
          allItems.push(...items.map(i => ({ ...i, platform: 'eBay' })))
        } catch (e) { console.error(`eBay failed for "${search.name}":`, e) }
      }

      if (platforms.includes('Etsy')) {
        try {
          const { items } = await searchEtsy(keywords, search.min_price, search.max_price)
          allItems.push(...items.map(i => ({ ...i, platform: 'Etsy' })))
        } catch (e) { console.error(`Etsy failed for "${search.name}":`, e) }
      }

      // Deduplicate
      const urls = allItems.map(r => r.url).filter(Boolean)
      const existingUrls = new Set<string>()
      if (urls.length > 0) {
        const { data: existing } = await sb.from('finds').select('url').in('url', urls)
        for (const row of existing ?? []) {
          if (row.url) existingUrls.add(row.url)
        }
      }
      const newFinds = allItems.filter(r => r.url && !existingUrls.has(r.url))

      if (newFinds.length > 0) {
        await sb.from('finds').insert(newFinds.map(f => ({
          title: f.title, price: f.price, platform: f.platform, era: 'General',
          status: 'New', image_url: f.imageUrl, url: f.url,
          found_at: new Date().toISOString(), search_name: search.name,
          description: f.condition, seller: f.seller, condition: f.condition,
        })))
      }

      await sb.from('searches').update({
        last_run: new Date().toISOString(),
        results_today: newFinds.length,
      }).eq('id', search.id)

      summary.push({ name: search.name, searched: allItems.length, new: newFinds.length })
    } catch (err) {
      summary.push({ name: search.name, error: String(err) })
    }
  }

  console.log('Cron search results:', JSON.stringify(summary))
  return NextResponse.json({ ran: searches.length, summary })
}

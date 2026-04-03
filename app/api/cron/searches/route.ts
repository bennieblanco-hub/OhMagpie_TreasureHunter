import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

// Cron job: runs all active saved searches at 7am, 1pm, 7pm daily
// Configured in vercel.json: "0 7,13,19 * * *"
// Verify with CRON_SECRET to prevent unauthorized access

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = supabaseServer()

  // Reset daily counts at first run of the day (7am)
  const hour = new Date().getUTCHours()
  if (hour === 7) {
    await sb.from('searches').update({ results_today: 0 }).gt('results_today', 0)
  }

  // Fetch all active searches
  const { data: searches, error } = await sb
    .from('searches')
    .select('id, name')
    .eq('active', true)

  if (error || !searches?.length) {
    return NextResponse.json({ message: 'No active searches', error: error?.message })
  }

  // Run each search via the runner API
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const results = await Promise.allSettled(
    searches.map(async (search) => {
      const res = await fetch(`${origin}/api/searches/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId: search.id }),
      })
      const data = await res.json()
      return { id: search.id, name: search.name, ...data }
    })
  )

  const summary = results.map((r, i) => ({
    search: searches[i].name,
    status: r.status,
    ...(r.status === 'fulfilled' ? r.value : { error: String(r.reason) }),
  }))

  console.log('Cron search results:', JSON.stringify(summary))

  return NextResponse.json({ ran: searches.length, summary })
}

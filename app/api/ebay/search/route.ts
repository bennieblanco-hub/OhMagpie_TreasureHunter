import { NextRequest, NextResponse } from 'next/server'
import { searchEbay } from '@/lib/search'

export async function POST(req: NextRequest) {
  try {
    const { keywords, minPrice, maxPrice } = await req.json()
    if (!keywords?.length) {
      return NextResponse.json({ error: 'keywords required' }, { status: 400 })
    }
    const result = await searchEbay(keywords, minPrice, maxPrice)
    return NextResponse.json(result)
  } catch (err) {
    console.error('eBay search failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'eBay search failed' },
      { status: 500 }
    )
  }
}

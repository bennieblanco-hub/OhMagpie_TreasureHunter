import { NextRequest, NextResponse } from 'next/server'
import { searchEtsy } from '@/lib/search'

export async function POST(req: NextRequest) {
  try {
    const { keywords, minPrice, maxPrice } = await req.json()
    if (!keywords?.length) {
      return NextResponse.json({ error: 'keywords required' }, { status: 400 })
    }
    const result = await searchEtsy(keywords, minPrice, maxPrice)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Etsy search failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Etsy search failed' },
      { status: 500 }
    )
  }
}

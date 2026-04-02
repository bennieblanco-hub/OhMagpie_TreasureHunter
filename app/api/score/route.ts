import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { find, profile } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ score: 50, reason: 'AI scoring not configured — add ANTHROPIC_API_KEY' })
  }

  const topEras = Object.entries(profile.eraScores as Record<string, number>)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([era, score]) => `${era} (${Math.round(score * 100)}%)`)
    .join(', ')

  const topGems = Object.entries(profile.gemstonePreferences as Record<string, number>)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([gem, score]) => `${gem} (${Math.round(score * 100)}%)`)
    .join(', ')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `You help Tan, who runs @ohmagpie on Instagram buying and reselling antique jewellery. Score this new find.

Her profile:
- Favourite eras: ${topEras || 'still learning'}
- Preferred gemstones: ${topGems || 'still learning'}
- Typical price range: £${profile.priceRange.min}–£${profile.priceRange.max}
- Liked keywords: ${profile.likedKeywords.slice(0, 8).join(', ') || 'none yet'}
- Total interactions: ${profile.totalInteractions}

New find:
- Title: ${find.title}
- Price: £${find.price}
- Era: ${find.era}
- Condition: ${find.condition || 'not stated'}

Respond ONLY with valid JSON, no other text: {"score": 85, "reason": "one short sentence"}`,
          },
        ],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ score: parsed.score, reason: parsed.reason })
  } catch {
    return NextResponse.json({ score: 50, reason: 'Could not score — check API key' })
  }
}

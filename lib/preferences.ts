import { Find, Interaction, PreferenceProfile, Era } from './types'

const STORAGE_KEY = 'ohmagpie_preferences'
const INTERACTIONS_KEY = 'ohmagpie_interactions'

const GEMSTONE_PATTERNS: Record<string, string[]> = {
  pearl:     ['pearl', 'seed pearl'],
  garnet:    ['garnet'],
  sapphire:  ['sapphire'],
  diamond:   ['diamond'],
  coral:     ['coral'],
  turquoise: ['turquoise'],
  enamel:    ['enamel', 'guilloché'],
  jet:       ['jet', 'whitby'],
  paste:     ['paste', 'rhinestone', 'marcasite'],
  ruby:      ['ruby'],
  emerald:   ['emerald'],
  amethyst:  ['amethyst'],
  topaz:     ['topaz'],
  peridot:   ['peridot'],
}

function extractGemstones(title: string): string[] {
  const lower = title.toLowerCase()
  return Object.entries(GEMSTONE_PATTERNS)
    .filter(([, patterns]) => patterns.some(p => lower.includes(p)))
    .map(([gem]) => gem)
}

function extractKeywords(title: string): string[] {
  const stopwords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'of', 'with', 'set', 'old', 'antique', 'vintage'])
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w))
}

export function getProfile(): PreferenceProfile {
  if (typeof window === 'undefined') return defaultProfile()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : defaultProfile()
  } catch {
    return defaultProfile()
  }
}

export function getInteractions(): Interaction[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(INTERACTIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function defaultProfile(): PreferenceProfile {
  return {
    eraScores: {},
    priceRange: { min: 0, max: 500, avg: 150 },
    likedKeywords: [],
    dislikedKeywords: [],
    gemstonePreferences: {},
    totalInteractions: 0,
    savedCount: 0,
    watchCount: 0,
    passCount: 0,
    lastUpdated: new Date().toISOString(),
  }
}

function saveProfile(profile: PreferenceProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

function saveInteractions(interactions: Interaction[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(interactions))
}

export function recordInteraction(find: Find, action: 'save' | 'watch' | 'pass'): PreferenceProfile {
  const profile = getProfile()
  const interactions = getInteractions()

  // Log the interaction
  interactions.unshift({
    findId: find.id,
    findTitle: find.title,
    findPrice: find.price,
    findEra: find.era,
    action,
    timestamp: new Date().toISOString(),
  })
  saveInteractions(interactions.slice(0, 500)) // cap at 500

  // Update counts
  profile.totalInteractions++
  if (action === 'save')  profile.savedCount++
  if (action === 'watch') profile.watchCount++
  if (action === 'pass')  profile.passCount++

  // Weight: save = +1.0, watch = +0.5, pass = -0.3
  const weight = action === 'save' ? 1.0 : action === 'watch' ? 0.5 : -0.3

  // Update era scores (exponential moving average)
  const currentEra = (profile.eraScores[find.era] ?? 0.5)
  profile.eraScores[find.era] = Math.max(0, Math.min(1,
    currentEra + weight * 0.15
  ))

  // Update gemstone preferences
  const gems = extractGemstones(find.title)
  for (const gem of gems) {
    const current = profile.gemstonePreferences[gem] ?? 0.5
    profile.gemstonePreferences[gem] = Math.max(0, Math.min(1,
      current + weight * 0.2
    ))
  }

  // Update keywords
  const keywords = extractKeywords(find.title)
  if (action === 'save') {
    for (const kw of keywords) {
      if (!profile.likedKeywords.includes(kw)) {
        profile.likedKeywords.unshift(kw)
        profile.likedKeywords = profile.likedKeywords.slice(0, 30)
      }
    }
  } else if (action === 'pass') {
    for (const kw of keywords) {
      if (!profile.dislikedKeywords.includes(kw)) {
        profile.dislikedKeywords.unshift(kw)
        profile.dislikedKeywords = profile.dislikedKeywords.slice(0, 30)
      }
      profile.likedKeywords = profile.likedKeywords.filter(k => k !== kw)
    }
  }

  // Update price range (rolling average of saved/watched items)
  if (action === 'save' || action === 'watch') {
    const allPositive = interactions
      .filter(i => i.action === 'save' || i.action === 'watch')
      .slice(0, 50)
      .map(i => i.findPrice)

    if (allPositive.length > 0) {
      const sorted = [...allPositive].sort((a, b) => a - b)
      profile.priceRange = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
      }
    }
  }

  profile.lastUpdated = new Date().toISOString()
  saveProfile(profile)
  return profile
}

// Score a find against the current profile (0–100)
export function scoreFindLocally(find: Find, profile: PreferenceProfile): { score: number; reason: string } {
  let score = 50 // baseline
  const reasons: string[] = []

  // Era match
  const eraScore = profile.eraScores[find.era]
  if (eraScore !== undefined) {
    const eraContrib = (eraScore - 0.5) * 40
    score += eraContrib
    if (eraScore > 0.7) reasons.push(`${find.era} pieces frequently saved`)
    if (eraScore < 0.3) reasons.push(`${find.era} often passed`)
  }

  // Price match
  if (profile.totalInteractions > 3) {
    const { min, max, avg } = profile.priceRange
    const range = max - min
    const dist = Math.abs(find.price - avg)
    if (find.price >= min && find.price <= max) {
      score += 10
      reasons.push('Price in typical range')
    } else if (range > 0) {
      score -= Math.min(20, (dist / range) * 20)
    }
  }

  // Keyword match
  const keywords = extractKeywords(find.title)
  const likedMatches = keywords.filter(k => profile.likedKeywords.includes(k)).length
  const dislikedMatches = keywords.filter(k => profile.dislikedKeywords.includes(k)).length
  score += likedMatches * 8
  score -= dislikedMatches * 10
  if (likedMatches > 0) reasons.push(`Matches saved keywords`)

  // Gemstone match
  const gems = extractGemstones(find.title)
  let gemContrib = 0
  for (const gem of gems) {
    const pref = profile.gemstonePreferences[gem]
    if (pref !== undefined) {
      gemContrib += (pref - 0.5) * 15
    }
  }
  score += gemContrib
  if (gemContrib > 5) reasons.push(`Preferred gemstones`)

  score = Math.round(Math.max(0, Math.min(100, score)))
  const reason = reasons.length > 0
    ? reasons.slice(0, 2).join('. ')
    : profile.totalInteractions < 5
      ? 'Not enough data yet — keep saving and passing'
      : 'Neutral match'

  return { score, reason }
}

export function seedProfileFromFinds(finds: Find[]): void {
  // Pre-seed the profile from existing mock data so it's not blank on first load
  for (const find of finds) {
    if (find.status === 'Saved') recordInteraction(find, 'save')
    else if (find.status === 'Watching') recordInteraction(find, 'watch')
    else if (find.status === 'Pass') recordInteraction(find, 'pass')
  }
}

import { supabase } from './supabase'
import { Shop, Find, SavedSearch, FindStatus, Interaction, PreferenceProfile } from './types'

// ─── SHOPS ────────────────────────────────────────────────────────────────────
export async function getShops(): Promise<Shop[]> {
  const allRows: any[] = []
  const pageSize = 1000
  let from = 0

  // Paginate through all shops — Supabase default limit is 1000
  while (true) {
    const { data, error } = await supabase
      .from('shops')
      .select('id,name,address,town,county,postcode,lat,lng,distance_miles,eras,type,phone,email,website,instagram,opening_hours,notes,verified')
      .order('distance_miles', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) { console.error('getShops:', error); break }
    if (!data || data.length === 0) break

    allRows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return allRows.map(row => ({
    id:           row.id,
    name:         row.name,
    address:      row.address ?? '',
    town:         row.town ?? '',
    county:       row.county ?? '',
    postcode:     row.postcode ?? '',
    lat:          row.lat,
    lng:          row.lng,
    distance:     row.distance_miles,
    eras:         row.eras ?? [],
    type:         row.type,
    phone:        row.phone,
    email:        row.email,
    website:      row.website,
    instagram:    row.instagram,
    openingHours: row.opening_hours,
    notes:        row.notes ?? '',
    verified:     row.verified ?? false,
  }))
}

// ─── FINDS ────────────────────────────────────────────────────────────────────
export async function getFinds(): Promise<Find[]> {
  const { data, error } = await supabase
    .from('finds')
    .select('*')
    .order('found_at', { ascending: false })

  if (error) { console.error('getFinds:', error); return [] }

  return data.map(row => ({
    id:             row.id,
    title:          row.title,
    price:          row.price,
    platform:       row.platform,
    era:            row.era,
    status:         row.status as FindStatus,
    imageUrl:       row.image_url ?? '',
    url:            row.url,
    foundAt:        row.found_at,
    searchName:     row.search_name ?? '',
    description:    row.description,
    seller:         row.seller,
    condition:      row.condition,
    interestScore:  row.interest_score,
    interestReason: row.interest_reason,
  }))
}

export async function updateFindStatus(id: number, status: FindStatus): Promise<void> {
  const { error } = await supabase
    .from('finds')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('updateFindStatus:', error)
}

export async function updateFindScore(id: number, score: number, reason: string): Promise<void> {
  const { error } = await supabase
    .from('finds')
    .update({ interest_score: score, interest_reason: reason })
    .eq('id', id)

  if (error) console.error('updateFindScore:', error)
}

// ─── SEARCHES ─────────────────────────────────────────────────────────────────
export async function getSearches(): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from('searches')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) { console.error('getSearches:', error); return [] }

  return data.map(row => ({
    id:            row.id,
    name:          row.name,
    keywords:      row.keywords ?? [],
    platforms:     row.platforms ?? [],
    minPrice:      row.min_price,
    maxPrice:      row.max_price,
    active:        row.active,
    lastRun:       row.last_run ? new Date(row.last_run).toLocaleDateString() : undefined,
    resultsToday:  row.results_today ?? 0,
  }))
}

export async function toggleSearch(id: number, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('searches')
    .update({ active })
    .eq('id', id)

  if (error) console.error('toggleSearch:', error)
}

// ─── INTERACTIONS ─────────────────────────────────────────────────────────────
export async function recordInteractionDB(
  find: Find,
  action: 'save' | 'watch' | 'pass'
): Promise<void> {
  const { error } = await supabase
    .from('interactions')
    .insert({
      find_id:    find.id,
      find_title: find.title,
      find_price: find.price,
      find_era:   find.era,
      action,
    })

  if (error) console.error('recordInteraction:', error)
}

export async function getInteractionsDB(): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) { console.error('getInteractions:', error); return [] }

  return data.map(row => ({
    findId:    row.find_id,
    findTitle: row.find_title,
    findPrice: row.find_price,
    findEra:   row.find_era,
    action:    row.action,
    timestamp: row.created_at,
  }))
}

// ─── PREFERENCE PROFILE (built from interactions) ─────────────────────────────
export async function buildProfileFromDB(): Promise<PreferenceProfile> {
  const interactions = await getInteractionsDB()

  const profile: PreferenceProfile = {
    eraScores: {},
    priceRange: { min: 0, max: 500, avg: 150 },
    likedKeywords: [],
    dislikedKeywords: [],
    gemstonePreferences: {},
    totalInteractions: interactions.length,
    savedCount:  interactions.filter(i => i.action === 'save').length,
    watchCount:  interactions.filter(i => i.action === 'watch').length,
    passCount:   interactions.filter(i => i.action === 'pass').length,
    lastUpdated: new Date().toISOString(),
  }

  // Build era scores
  const eraCounts: Record<string, { pos: number; neg: number }> = {}
  for (const i of interactions) {
    if (!i.findEra) continue
    if (!eraCounts[i.findEra]) eraCounts[i.findEra] = { pos: 0, neg: 0 }
    if (i.action === 'save' || i.action === 'watch') eraCounts[i.findEra].pos++
    else eraCounts[i.findEra].neg++
  }
  for (const [era, counts] of Object.entries(eraCounts)) {
    const total = counts.pos + counts.neg
    if (total > 0) profile.eraScores[era as any] = counts.pos / total
  }

  // Price range from saved/watched
  const positive = interactions
    .filter(i => i.action === 'save' || i.action === 'watch')
    .map(i => i.findPrice)
    .filter(Boolean)
  if (positive.length > 0) {
    const sorted = [...positive].sort((a, b) => a - b)
    profile.priceRange = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    }
  }

  return profile
}

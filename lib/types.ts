export type Era =
  | 'Victorian'
  | 'Georgian'
  | 'Edwardian'
  | 'Art Deco'
  | 'Art Nouveau'
  | 'Regency'
  | 'Scottish'
  | 'General'
  | 'Modern'

export interface Shop {
  id: number
  name: string
  address: string
  town: string
  county: string
  postcode: string
  lat: number
  lng: number
  distance: number // miles from Axbridge
  eras: Era[]
  type: 'specialist' | 'market' | 'general'
  phone?: string
  email?: string
  website?: string
  instagram?: string
  openingHours?: string
  notes: string
  verified: boolean // whether contact info has been verified
}

export interface SavedSearch {
  id: number
  name: string
  keywords: string[]
  platforms: string[]
  minPrice: number
  maxPrice: number
  active: boolean
  lastRun?: string
  resultsToday?: number
}

export type FindStatus = 'New' | 'Watching' | 'Saved' | 'Pass'

export interface Find {
  id: number
  title: string
  price: number
  platform: string
  era: Era
  status: FindStatus
  imageUrl: string
  foundAt: string
  url?: string
  searchName: string
  description?: string
  seller?: string
  condition?: string
  interestScore?: number // 0–100, AI-generated
  interestReason?: string
}

// Preference learning
export interface PreferenceProfile {
  eraScores: Partial<Record<Era, number>>   // 0–1, frequency of saves
  priceRange: { min: number; max: number; avg: number }
  likedKeywords: string[]
  dislikedKeywords: string[]
  gemstonePreferences: Record<string, number>
  totalInteractions: number
  savedCount: number
  watchCount: number
  passCount: number
  lastUpdated: string
}

export interface Interaction {
  findId: number
  findTitle: string
  findPrice: number
  findEra: Era
  action: 'save' | 'watch' | 'pass'
  timestamp: string
}

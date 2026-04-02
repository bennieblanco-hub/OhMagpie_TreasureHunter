/**
 * OhMagpie TreasureHunter — UK Antique Jewellery Shop Crawler
 * Uses Google Places API (New) — Text Search + Place Details
 *
 * Run with: npm run crawl
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!MAPS_KEY || !SUPA_URL || !SUPA_KEY) {
  console.error('❌  Missing env vars. Check .env.local')
  process.exit(1)
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } })

const HOME = { lat: 51.2897, lng: -2.8174 }

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

const UK_CITIES = [
  // South West
  { name:'Bristol',             lat:51.4545, lng:-2.5879, county:'Bristol' },
  { name:'Bath',                lat:51.3811, lng:-2.3592, county:'Somerset' },
  { name:'Wells',               lat:51.2094, lng:-2.6474, county:'Somerset' },
  { name:'Glastonbury',         lat:51.1431, lng:-2.7162, county:'Somerset' },
  { name:'Taunton',             lat:51.0153, lng:-3.1014, county:'Somerset' },
  { name:'Frome',               lat:51.2295, lng:-2.3196, county:'Somerset' },
  { name:'Weston-super-Mare',   lat:51.3462, lng:-2.9773, county:'Somerset' },
  { name:'Exeter',              lat:50.7184, lng:-3.5345, county:'Devon' },
  { name:'Plymouth',            lat:50.3755, lng:-4.1427, county:'Devon' },
  { name:'Totnes',              lat:50.4308, lng:-3.6847, county:'Devon' },
  { name:'Truro',               lat:50.2632, lng:-5.0510, county:'Cornwall' },
  { name:'Dorchester',          lat:50.7154, lng:-2.4382, county:'Dorset' },
  { name:'Bournemouth',         lat:50.7192, lng:-1.8808, county:'Dorset' },
  { name:'Sherborne',           lat:50.9450, lng:-2.5164, county:'Dorset' },
  { name:'Salisbury',           lat:51.0693, lng:-1.7943, county:'Wiltshire' },
  { name:'Marlborough',         lat:51.4210, lng:-1.7296, county:'Wiltshire' },
  // South East
  { name:'London Mayfair',      lat:51.5100, lng:-0.1450, county:'London' },
  { name:'London Notting Hill', lat:51.5148, lng:-0.2044, county:'London' },
  { name:'London Islington',    lat:51.5390, lng:-0.1027, county:'London' },
  { name:'London Bermondsey',   lat:51.4980, lng:-0.0730, county:'London' },
  { name:'London Marylebone',   lat:51.5240, lng:-0.1600, county:'London' },
  { name:'London Kensington',   lat:51.4994, lng:-0.1937, county:'London' },
  { name:'London Chelsea',      lat:51.4875, lng:-0.1687, county:'London' },
  { name:'London Hatton Garden',lat:51.5186, lng:-0.1085, county:'London' },
  { name:'Brighton',            lat:50.8229, lng:-0.1363, county:'East Sussex' },
  { name:'Lewes',               lat:50.8741, lng:0.0104,  county:'East Sussex' },
  { name:'Tunbridge Wells',     lat:51.1323, lng:0.2637,  county:'Kent' },
  { name:'Canterbury',          lat:51.2802, lng:1.0789,  county:'Kent' },
  { name:'Rye',                 lat:50.9541, lng:0.7306,  county:'East Sussex' },
  { name:'Petworth',            lat:50.9955, lng:-0.6143, county:'West Sussex' },
  { name:'Guildford',           lat:51.2362, lng:-0.5704, county:'Surrey' },
  { name:'Winchester',          lat:51.0632, lng:-1.3082, county:'Hampshire' },
  { name:'Southampton',         lat:50.9097, lng:-1.4044, county:'Hampshire' },
  { name:'Oxford',              lat:51.7520, lng:-1.2577, county:'Oxfordshire' },
  { name:'Windsor',             lat:51.4839, lng:-0.6044, county:'Berkshire' },
  { name:'Cambridge',           lat:52.2053, lng:0.1218,  county:'Cambridgeshire' },
  { name:'Bury St Edmunds',     lat:52.2469, lng:0.7148,  county:'Suffolk' },
  { name:'Norwich',             lat:52.6309, lng:1.2974,  county:'Norfolk' },
  // Cotswolds / Midlands
  { name:'Cheltenham',          lat:51.8994, lng:-2.0783, county:'Gloucestershire' },
  { name:'Cirencester',         lat:51.7196, lng:-1.9672, county:'Gloucestershire' },
  { name:'Tetbury',             lat:51.6397, lng:-2.1595, county:'Gloucestershire' },
  { name:'Chipping Campden',    lat:52.0559, lng:-1.7792, county:'Gloucestershire' },
  { name:'Stow-on-the-Wold',    lat:51.9296, lng:-1.7250, county:'Gloucestershire' },
  { name:'Stroud',              lat:51.7452, lng:-2.2165, county:'Gloucestershire' },
  { name:'Gloucester',          lat:51.8642, lng:-2.2381, county:'Gloucestershire' },
  { name:'Malvern',             lat:52.1140, lng:-2.3241, county:'Worcestershire' },
  { name:'Worcester',           lat:52.1920, lng:-2.2196, county:'Worcestershire' },
  { name:'Hereford',            lat:52.0567, lng:-2.7158, county:'Herefordshire' },
  { name:'Ludlow',              lat:52.3682, lng:-2.7178, county:'Shropshire' },
  { name:'Shrewsbury',          lat:52.7080, lng:-2.7539, county:'Shropshire' },
  { name:'Stratford-upon-Avon', lat:52.1918, lng:-1.7083, county:'Warwickshire' },
  { name:'Birmingham',          lat:52.4862, lng:-1.8904, county:'West Midlands' },
  { name:'Coventry',            lat:52.4068, lng:-1.5197, county:'West Midlands' },
  { name:'Leamington Spa',      lat:52.2915, lng:-1.5362, county:'Warwickshire' },
  { name:'Nottingham',          lat:52.9548, lng:-1.1581, county:'Nottinghamshire' },
  { name:'Derby',               lat:52.9226, lng:-1.4746, county:'Derbyshire' },
  { name:'Leicester',           lat:52.6369, lng:-1.1398, county:'Leicestershire' },
  { name:'Lincoln',             lat:53.2307, lng:-0.5406, county:'Lincolnshire' },
  { name:'Stamford',            lat:52.6531, lng:-0.4824, county:'Lincolnshire' },
  // North / Yorkshire
  { name:'Leeds',               lat:53.7997, lng:-1.5492, county:'Yorkshire' },
  { name:'York',                lat:53.9590, lng:-1.0815, county:'Yorkshire' },
  { name:'Harrogate',           lat:53.9925, lng:-1.5401, county:'Yorkshire' },
  { name:'Skipton',             lat:53.9619, lng:-2.0174, county:'Yorkshire' },
  { name:'Ilkley',              lat:53.9250, lng:-1.8309, county:'Yorkshire' },
  { name:'Sheffield',           lat:53.3811, lng:-1.4701, county:'Yorkshire' },
  { name:'Bradford',            lat:53.7960, lng:-1.7594, county:'Yorkshire' },
  { name:'Hull',                lat:53.7457, lng:-0.3367, county:'Yorkshire' },
  { name:'Beverley',            lat:53.8404, lng:-0.4333, county:'Yorkshire' },
  { name:'Manchester',          lat:53.4808, lng:-2.2426, county:'Greater Manchester' },
  { name:'Chester',             lat:53.1905, lng:-2.8910, county:'Cheshire' },
  { name:'Knutsford',           lat:53.3025, lng:-2.3715, county:'Cheshire' },
  { name:'Liverpool',           lat:53.4084, lng:-2.9916, county:'Merseyside' },
  { name:'Lancaster',           lat:54.0465, lng:-2.8007, county:'Lancashire' },
  { name:'Kendal',              lat:54.3237, lng:-2.7449, county:'Cumbria' },
  { name:'Newcastle',           lat:54.9783, lng:-1.6178, county:'Tyne and Wear' },
  { name:'Durham',              lat:54.7761, lng:-1.5733, county:'County Durham' },
  { name:'Barnard Castle',      lat:54.5444, lng:-1.9199, county:'County Durham' },
  // Scotland
  { name:'Edinburgh',           lat:55.9533, lng:-3.1883, county:'Edinburgh' },
  { name:'Glasgow',             lat:55.8642, lng:-4.2518, county:'Glasgow' },
  { name:'Stirling',            lat:56.1165, lng:-3.9369, county:'Stirlingshire' },
  { name:'Perth',               lat:56.3950, lng:-3.4370, county:'Perthshire' },
  { name:'Dundee',              lat:56.4620, lng:-2.9707, county:'Angus' },
  { name:'Aberdeen',            lat:57.1497, lng:-2.0943, county:'Aberdeenshire' },
  { name:'St Andrews',          lat:56.3398, lng:-2.7967, county:'Fife' },
  // Wales
  { name:'Cardiff',             lat:51.4816, lng:-3.1791, county:'Cardiff' },
  { name:'Abergavenny',         lat:51.8241, lng:-3.0152, county:'Monmouthshire' },
  { name:'Hay-on-Wye',          lat:52.0736, lng:-3.1265, county:'Powys' },
]

const SEARCH_QUERIES = [
  'antique jewellery shop',
  'antique jewellery dealer',
  'vintage jewellery specialist',
]

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── New Places API — Text Search ─────────────────────────────────────────────
async function textSearch(query: string, lat: number, lng: number, pageToken?: string): Promise<any> {
  const body: any = {
    textQuery: query,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 40000.0,
      },
    },
    maxResultCount: 20,
    languageCode: 'en',
  }
  if (pageToken) body.pageToken = pageToken

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': MAPS_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.addressComponents,places.types,nextPageToken',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

function extractTown(components: any[]): { town: string; county: string } {
  let town = '', county = ''
  for (const c of (components || [])) {
    const types: string[] = c.types || []
    if (types.includes('postal_town')) town = c.longText || c.longName || ''
    if (types.includes('locality') && !town) town = c.longText || c.longName || ''
    if (types.includes('administrative_area_level_2')) county = c.longText || c.longName || ''
    if (types.includes('administrative_area_level_1') && !county) county = c.longText || c.longName || ''
  }
  return { town: town || 'Unknown', county: county || 'Unknown' }
}

function extractPostcode(address: string): string {
  const match = (address || '').match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i)
  return match ? match[0].toUpperCase() : ''
}

async function upsertShop(place: any): Promise<boolean> {
  const loc = place.location
  if (!loc) return false

  const lat = loc.latitude
  const lng = loc.longitude
  const distance = distanceMiles(HOME.lat, HOME.lng, lat, lng)
  const { town, county } = extractTown(place.addressComponents || [])
  const postcode = extractPostcode(place.formattedAddress || '')

  const openingHours = place.regularOpeningHours?.weekdayDescriptions?.join(' | ') || null

  const { error } = await supabase.from('shops').upsert({
    google_place_id: place.id,
    name:            place.displayName?.text || 'Unknown',
    raw_address:     place.formattedAddress || '',
    address:         (place.formattedAddress || '').split(',')[0] || '',
    town,
    county,
    postcode,
    lat,
    lng,
    distance_miles:  distance,
    eras:            ['Victorian', 'General'],
    type:            'general',
    phone:           place.internationalPhoneNumber || null,
    website:         place.websiteUri || null,
    opening_hours:   openingHours,
    notes:           `Found via Google Places.`,
    verified:        false,
    source:          'google_places',
  }, { onConflict: 'google_place_id' })

  if (error) {
    console.error(`\n  ❌ ${place.displayName?.text}: ${error.message}`)
    return false
  }
  return true
}

async function crawlCity(city: typeof UK_CITIES[0]): Promise<number> {
  let total = 0
  const seen = new Set<string>()

  for (const query of SEARCH_QUERIES) {
    let pageToken: string | undefined
    let page = 0

    do {
      if (pageToken) await sleep(2000)

      const data = await textSearch(`${query} UK`, city.lat, city.lng, pageToken)

      if (data.error) {
        console.error(`\n  ❌ API error: ${data.error.message}`)
        if (data.error.code === 403) process.exit(1)
        break
      }

      const places: any[] = data.places || []

      for (const place of places) {
        if (!place.id || seen.has(place.id)) continue
        seen.add(place.id)
        await sleep(100)
        const ok = await upsertShop(place)
        if (ok) {
          total++
          process.stdout.write(`\r  ${city.name}: ${total} shops`)
        }
      }

      pageToken = data.nextPageToken
      page++
    } while (pageToken && page < 3)

    await sleep(500)
  }

  return total
}

async function main() {
  console.log('\n🔍  OhMagpie TreasureHunter — UK Shop Crawler (Places API New)')
  console.log('━'.repeat(55))
  console.log(`📍  Home: Axbridge, Somerset`)
  console.log(`🏙  Cities: ${UK_CITIES.length}`)
  console.log(`🔑  Key: ${MAPS_KEY.slice(0,12)}...`)
  console.log('━'.repeat(55))
  console.log('\nStarting... takes 15–30 minutes.\n')

  let grandTotal = 0

  for (let i = 0; i < UK_CITIES.length; i++) {
    const city = UK_CITIES[i]
    process.stdout.write(`[${String(i+1).padStart(2,'0')}/${UK_CITIES.length}] ${city.name.padEnd(22)}`)
    try {
      const count = await crawlCity(city)
      grandTotal += count
      console.log(`\r[${String(i+1).padStart(2,'0')}/${UK_CITIES.length}] ${city.name.padEnd(22)} ✓ ${count}`)
    } catch (err: any) {
      console.log(`\r[${String(i+1).padStart(2,'0')}/${UK_CITIES.length}] ${city.name.padEnd(22)} ⚠ ${err.message}`)
    }
    await sleep(800)
  }

  console.log('\n' + '━'.repeat(55))
  console.log(`✅  Done. Total shops in database: ${grandTotal}`)
  console.log('━'.repeat(55) + '\n')
}

main().catch(err => { console.error(err); process.exit(1) })
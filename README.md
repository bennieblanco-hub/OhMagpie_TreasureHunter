# OhMagpie_TreasureHunter v2

Antique jewellery intelligence platform for [@ohmagpie](https://instagram.com/ohmagpie).

**What's new in v2:**
- Full Google Maps view with 28 UK shop markers
- Click any marker to see address, phone, email, opening hours
- Zoomable image lightbox for every find (keyboard: +/- to zoom, drag to pan)
- AI-powered interest scoring — learns from every save/watch/pass decision
- Preference profile panel — era scores, gemstone preferences, price range
- Anthropic API integration for intelligent find scoring

---

## Setup

### 1. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 2. Add your API keys

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

**Google Maps** (required for map view):
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable **Maps JavaScript API**
3. Create credentials → API key → add to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
4. Go to **Map Management** → Create a Map ID → add to `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
5. Restart dev server

**Anthropic API** (optional, for AI scoring):
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key → add to `ANTHROPIC_API_KEY`

---

## Project structure

```
OhMagpie_TreasureHunter/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main app — all four tabs
│   ├── globals.css             # CSS variables + base styles
│   └── api/score/route.ts      # AI scoring endpoint (Anthropic)
├── components/
│   ├── MapView.tsx             # Google Maps with shop markers
│   └── Lightbox.tsx            # Zoomable image viewer
├── lib/
│   ├── data.ts                 # 28 UK shops + finds + searches
│   ├── types.ts                # TypeScript types
│   └── preferences.ts          # Learning engine (localStorage)
└── .env.local.example          # All required env vars
```

---

## Phase 2 — Live data

Once deployed, add Supabase and eBay API credentials to run live searches:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
```

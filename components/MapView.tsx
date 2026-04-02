'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from '@vis.gl/react-google-maps'
import { Shop } from '@/lib/types'
import FilterBar, { FilterState, ShopCategory } from '@/components/FilterBar'
import { ShopInfoWindow, ShopBottomSheet } from '@/components/ShopPopup'

// ─── Constants ─────────────────────────────────────────────────────────────

const AXBRIDGE = { lat: 51.2897, lng: -2.8174 }

const DEFAULT_FILTERS: FilterState = {
  category: 'all',
  search: '',
  maxDistance: 200,
  eras: [],
}

// ─── Marker styling ────────────────────────────────────────────────────────

function markerColor(shop: Shop & { category?: ShopCategory }): string {
  // Category takes visual priority over distance
  switch (shop.category) {
    case 'jeweller':       return '#1D9E75'   // green
    case 'antique-shop':   return '#8B5C3E'   // warm brown
    case 'antique-market': return '#5B5EA6'   // indigo
    case 'dealer':         return '#2D6A8F'   // blue
    case 'auction':        return '#B8860B'   // gold
    default:               return '#6B6A65'   // grey
  }
}

// ─── Filtering logic ───────────────────────────────────────────────────────

function applyFilters(shops: Shop[], filters: FilterState): Shop[] {
  return shops.filter(shop => {
    if (filters.maxDistance && shop.distance > filters.maxDistance) return false
    if (filters.category !== 'all' && (shop as any).category !== filters.category) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hit =
        shop.name.toLowerCase().includes(q) ||
        shop.town.toLowerCase().includes(q) ||
        (shop.address?.toLowerCase().includes(q) ?? false)
      if (!hit) return false
    }
    if (filters.eras.length > 0) {
     const hasEra = filters.eras.some(era => shop.eras?.includes(era as any))
      if (!hasEra) return false
    }
    return true
  })
}

// ─── No API key fallback ──────────────────────────────────────────────────

function NoApiKey() {
  return (
    <div className="flex items-center justify-center h-full rounded-xl"
      style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)' }}>
      <div className="text-center px-8">
        <div className="text-4xl mb-4">🗺</div>
        <p className="text-[14px] font-medium mb-2">Map requires a Google Maps API key</p>
        <p className="text-[12px] mb-4" style={{ color: 'var(--color-muted)' }}>
          Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code className="bg-gray-100 px-1 rounded">.env.local</code>
        </p>
        <ol className="text-[11px] text-left space-y-1.5" style={{ color: 'var(--color-muted)' }}>
          <li>1. Go to <strong>console.cloud.google.com</strong></li>
          <li>2. Create a project → Enable <strong>Maps JavaScript API</strong></li>
          <li>3. Create credentials → API key</li>
          <li>4. Also enable <strong>Maps Map ID</strong> for advanced markers</li>
          <li>5. Add both keys to .env.local, restart dev server</li>
        </ol>
      </div>
    </div>
  )
}

// ─── List view (sidebar / mobile drawer) ──────────────────────────────────

interface ShopListProps {
  shops: Shop[]
  selected: Shop | null
  onSelect: (shop: Shop) => void
}

function ShopList({ shops, selected, onSelect }: ShopListProps) {
  if (shops.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>
        No shops match your filters.
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {shops.map(shop => (
        <button
          key={shop.id}
          onClick={() => onSelect(shop)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '10px 14px',
            border: 'none',
            borderBottom: '0.5px solid var(--color-border, #e5e5e5)',
            background: selected?.id === shop.id ? '#edf8f4' : 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            borderLeft: selected?.id === shop.id ? '3px solid #1D9E75' : '3px solid transparent',
            transition: 'background 0.1s',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{shop.name}</div>
          <div style={{ fontSize: 11, color: '#888' }}>
            {shop.town} · {shop.distance} mi
          </div>
          {shop.eras?.length > 0 && (
            <div style={{ fontSize: 10, color: '#B8860B', marginTop: 3 }}>
              {shop.eras.slice(0, 3).join(' · ')}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── View toggle ───────────────────────────────────────────────────────────

type ViewMode = 'map' | 'list' | 'split'

function ViewToggle({ mode, onChange, isMobile }: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
  isMobile: boolean
}) {
  const options = isMobile
    ? [{ id: 'map', label: '🗺 Map' }, { id: 'list', label: '📋 List' }] as const
    : [{ id: 'map', label: '🗺 Map' }, { id: 'split', label: '⊞ Split' }, { id: 'list', label: '📋 List' }] as const

  return (
    <div style={{
      display: 'flex',
      gap: 2,
      background: 'var(--color-background, #f5f5f5)',
      borderRadius: 8,
      padding: 2,
    }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id as ViewMode)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            background: mode === opt.id ? '#fff' : 'transparent',
            boxShadow: mode === opt.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            fontSize: 12,
            fontFamily: 'inherit',
            cursor: 'pointer',
            color: mode === opt.id ? '#333' : '#888',
            fontWeight: mode === opt.id ? 500 : 400,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main MapView component ────────────────────────────────────────────────

interface MapViewProps {
  shops: Shop[]
  selectedShop: Shop | null
  onSelectShop: (shop: Shop | null) => void
}

export default function MapView({ selectedShop, onSelectShop, shops }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapId  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => {
      setIsMobile(mq.matches)
      if (mq.matches && viewMode === 'split') setViewMode('map')
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [viewMode])

  const visibleShops = applyFilters(shops, filters)

  const handleSelectShop = useCallback((shop: Shop | null) => {
    onSelectShop(shop)
    // On mobile map view, selecting a shop shows bottom sheet — no view switch needed
    // On list view, switch to map so user sees marker
    if (shop && viewMode === 'list' && !isMobile) setViewMode('split')
  }, [onSelectShop, viewMode, isMobile])

  if (!apiKey) return <NoApiKey />

  const mapEl = (
    <Map
      defaultCenter={AXBRIDGE}
      defaultZoom={7}
      mapId={mapId || 'ohmagpie-map'}
      gestureHandling="greedy"
      disableDefaultUI={false}
      style={{ width: '100%', height: '100%' }}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      onClick={() => onSelectShop(null)}
    >
      {/* Home marker */}
      <AdvancedMarker position={AXBRIDGE} title="Axbridge (home)">
        <Pin background="#141412" glyphColor="white" borderColor="white" glyph="🏠" />
      </AdvancedMarker>

      {/* Shop markers */}
      {visibleShops.map(shop => (
        <AdvancedMarker
          key={shop.id}
          position={{ lat: shop.lat, lng: shop.lng }}
          title={shop.name}
          onClick={() => handleSelectShop(shop)}
        >
          <Pin
            background={markerColor(shop as any)}
            glyphColor="white"
            borderColor="white"
            scale={selectedShop?.id === shop.id ? 1.35 : 1}
          />
        </AdvancedMarker>
      ))}

      {/* Desktop InfoWindow */}
      {selectedShop && !isMobile && (
        <ShopInfoWindow shop={selectedShop} onClose={() => onSelectShop(null)} />
      )}
    </Map>
  )

  return (
    <APIProvider apiKey={apiKey}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Filter bar */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          totalCount={shops.length}
          visibleCount={visibleShops.length}
        />

        {/* View toggle bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '6px 12px',
          borderBottom: '0.5px solid var(--color-border, #e5e5e5)',
          background: 'var(--color-surface, #fff)',
        }}>
          <ViewToggle mode={viewMode} onChange={setViewMode} isMobile={isMobile} />
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* Map pane */}
          {(viewMode === 'map' || viewMode === 'split') && (
            <div style={{
              flex: viewMode === 'split' ? '0 0 60%' : '1 1 100%',
              height: '100%',
              borderRadius: viewMode === 'map' ? '0 0 12px 12px' : '0 0 0 12px',
              overflow: 'hidden',
            }}>
              {mapEl}
            </div>
          )}

          {/* List pane */}
          {(viewMode === 'list' || viewMode === 'split') && (
            <div style={{
              flex: viewMode === 'split' ? '0 0 40%' : '1 1 100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: viewMode === 'split' ? '0.5px solid var(--color-border, #e5e5e5)' : 'none',
              background: 'var(--color-surface, #fff)',
              borderRadius: viewMode === 'list' ? '0 0 12px 12px' : '0 0 12px 0',
              overflow: 'hidden',
            }}>
              <ShopList
                shops={visibleShops}
                selected={selectedShop}
                onSelect={handleSelectShop}
              />
            </div>
          )}

        </div>
      </div>

      {/* Mobile bottom sheet */}
      {selectedShop && isMobile && (
        <ShopBottomSheet shop={selectedShop} onClose={() => onSelectShop(null)} />
      )}

    </APIProvider>
  )
}

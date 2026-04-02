'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps'
import { Shop } from '@/lib/types'

const AXBRIDGE = { lat: 51.2897, lng: -2.8174 }

function markerColor(distance: number): string {
  if (distance <= 30) return '#1D9E75'
  if (distance <= 80) return '#B8860B'
  return '#6B6A65'
}

function ShopPopup({ shop, onClose }: { shop: Shop; onClose: () => void }) {
  return (
    <InfoWindow position={{ lat: shop.lat, lng: shop.lng }} onCloseClick={onClose}>
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 260 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{shop.name}</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          {shop.address}, {shop.town} · {shop.distance} mi from Axbridge
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
          {(shop.eras || []).map(era => (
            <span key={era} style={{
              background: '#f0ede6', color: '#555', fontSize: 10,
              padding: '1px 6px', borderRadius: 20,
            }}>{era}</span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#444', marginBottom: 8 }}>{shop.notes}</div>
        {shop.phone && (
          <div style={{ fontSize: 12, marginBottom: 3 }}>
            📞 <a href={`tel:${shop.phone}`} style={{ color: '#1D9E75' }}>{shop.phone}</a>
          </div>
        )}
        {shop.email && (
          <div style={{ fontSize: 12, marginBottom: 3 }}>
            ✉️ <a href={`mailto:${shop.email}`} style={{ color: '#1D9E75' }}>{shop.email}</a>
          </div>
        )}
        {shop.website && (
          <div style={{ fontSize: 12, marginBottom: 3 }}>
            🌐 <a href={shop.website} target="_blank" rel="noreferrer" style={{ color: '#1D9E75' }}>
              {shop.website.replace('https://','').replace('www.','').split('/')[0]}
            </a>
          </div>
        )}
        {shop.openingHours && (
          <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
            🕐 {shop.openingHours.split('|')[0]}
          </div>
        )}
        {!shop.verified && (
          <div style={{ fontSize: 10, color: '#B8860B', marginTop: 6 }}>
            ⚠ Contact info unverified
          </div>
        )}
      </div>
    </InfoWindow>
  )
}

// Renders only the shops visible in the current map viewport
function ClusteredMarkers({
  shops,
  selectedShop,
  onSelectShop,
}: {
  shops: Shop[]
  selectedShop: Shop | null
  onSelectShop: (shop: Shop | null) => void
}) {
  const map = useMap()
  const [visibleShops, setVisibleShops] = useState<Shop[]>([])
  const [zoom, setZoom] = useState(7)

  const updateVisible = useCallback(() => {
    if (!map) return
    const bounds = map.getBounds()
    const z = map.getZoom() ?? 7
    setZoom(z)
    if (!bounds) return

    // At low zoom, show a sampled subset to keep performance smooth
    const inBounds = shops.filter(s =>
      s.lat && s.lng && bounds.contains({ lat: s.lat, lng: s.lng })
    )

    // Limit markers based on zoom level
    const limit = z >= 12 ? 500 : z >= 10 ? 200 : z >= 8 ? 80 : 40
    setVisibleShops(inBounds.slice(0, limit))
  }, [map, shops])

  useEffect(() => {
    if (!map) return
    const idleListener = map.addListener('idle', updateVisible)
    updateVisible()
    return () => idleListener.remove()
  }, [map, updateVisible])

  return (
    <>
      {visibleShops.map(shop => (
        <AdvancedMarker
          key={shop.id}
          position={{ lat: shop.lat, lng: shop.lng }}
          title={shop.name}
          onClick={() => onSelectShop(shop)}
        >
          <Pin
            background={markerColor(shop.distance)}
            glyphColor="white"
            borderColor="white"
            scale={selectedShop?.id === shop.id ? 1.4 : zoom >= 12 ? 1 : 0.7}
          />
        </AdvancedMarker>
      ))}
      {selectedShop && (
        <ShopPopup shop={selectedShop} onClose={() => onSelectShop(null)} />
      )}
    </>
  )
}

interface MapViewProps {
  shops: Shop[]
  selectedShop: Shop | null
  onSelectShop: (shop: Shop | null) => void
  filterDistance?: number
}

export default function MapView({ shops, selectedShop, onSelectShop, filterDistance }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapId  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

  const visibleShops = filterDistance
    ? shops.filter(s => s.distance <= filterDistance)
    : shops

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full rounded-xl"
        style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)' }}>
        <div className="text-center px-8">
          <div className="text-4xl mb-4">🗺</div>
          <p className="text-[14px] font-medium mb-2">Map requires a Google Maps API key</p>
          <p className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
            Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to .env.local
          </p>
        </div>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={AXBRIDGE}
        defaultZoom={7}
        mapId={mapId || 'ohmagpie-map'}
        gestureHandling="greedy"
        style={{ width: '100%', height: '100%', borderRadius: '12px' }}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
      >
        {/* Home — Axbridge */}
        <AdvancedMarker position={AXBRIDGE} title="Axbridge (home)">
          <Pin background="#141412" glyphColor="white" borderColor="white" glyph="🏠" />
        </AdvancedMarker>

        <ClusteredMarkers
          shops={visibleShops}
          selectedShop={selectedShop}
          onSelectShop={onSelectShop}
        />
      </Map>

      {/* Shop count overlay */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        background: 'rgba(0,0,0,0.6)', color: 'white',
        padding: '4px 10px', borderRadius: 20, fontSize: 11,
        pointerEvents: 'none',
      }}>
        {visibleShops.length.toLocaleString()} shops · zoom in to see more
      </div>
    </APIProvider>
  )
}

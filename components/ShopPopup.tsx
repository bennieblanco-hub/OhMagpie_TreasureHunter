'use client'

import { useEffect, useRef } from 'react'
import { InfoWindow } from '@vis.gl/react-google-maps'
import { Shop } from '@/lib/types'

// ─── Desktop: InfoWindow ────────────────────────────────────────────────────

export function ShopInfoWindow({ shop, onClose }: { shop: Shop; onClose: () => void }) {
  return (
    <InfoWindow position={{ lat: shop.lat, lng: shop.lng }} onCloseClick={onClose}>
      <ShopDetail shop={shop} />
    </InfoWindow>
  )
}

// ─── Mobile: Bottom Sheet ──────────────────────────────────────────────────

export function ShopBottomSheet({ shop, onClose }: { shop: Shop; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on backdrop tap
  useEffect(() => {
    const handler = (e: TouchEvent | MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
        zIndex: 999, backdropFilter: 'blur(1px)',
      }} />

      {/* Sheet */}
      <div
        ref={ref}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: '#fff',
          borderRadius: '16px 16px 0 0',
          zIndex: 1000,
          padding: '0 16px 32px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          maxHeight: '65vh',
          overflowY: 'auto',
          animation: 'slideUp 0.22s ease-out',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>

        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: '#ddd', margin: '12px auto 16px',
        }} />

        <ShopDetail shop={shop} />

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '12px',
            border: '0.5px solid #e5e5e5',
            borderRadius: 10,
            background: 'transparent',
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer',
            color: '#888',
          }}
        >
          Close
        </button>
      </div>
    </>
  )
}

// ─── Shared detail content ─────────────────────────────────────────────────

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null
  const labels: Record<string, { label: string; color: string; bg: string }> = {
    'jeweller':       { label: '💎 Jeweller',       color: '#1D9E75', bg: '#edf8f4' },
    'antique-shop':   { label: '🏺 Antique shop',   color: '#6B4F3A', bg: '#f8f2ec' },
    'antique-market': { label: '🏛 Market',          color: '#5B5EA6', bg: '#f0f0fa' },
    'dealer':         { label: '🔍 Dealer',          color: '#2D6A8F', bg: '#edf4f9' },
    'auction':        { label: '🔨 Auction house',   color: '#B8860B', bg: '#fdf8ee' },
    'other':          { label: '📍 Other',           color: '#888',    bg: '#f5f5f5' },
  }
  const style = labels[category] || labels['other']
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 20,
      background: style.bg, color: style.color, fontWeight: 500,
    }}>
      {style.label}
    </span>
  )
}

function ShopDetail({ shop }: { shop: Shop }) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 320 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{shop.name}</div>
        <CategoryBadge category={(shop as any).category} />
      </div>

      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
        {shop.address}, {shop.town} · <strong>{shop.distance} mi</strong> from Axbridge
      </div>

      {/* Era tags */}
      {shop.eras?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 10 }}>
          {shop.eras.map(era => (
            <span key={era} style={{
              background: '#f0ede6', color: '#555', fontSize: 10,
              padding: '1px 6px', borderRadius: 20,
            }}>
              {era}
            </span>
          ))}
        </div>
      )}

      {shop.notes && (
        <div style={{ fontSize: 12, color: '#444', marginBottom: 10, lineHeight: 1.5 }}>
          {shop.notes}
        </div>
      )}

      {/* Contact */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {shop.phone && (
          <a href={`tel:${shop.phone}`} style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none' }}>
            📞 {shop.phone}
          </a>
        )}
        {shop.email && (
          <a href={`mailto:${shop.email}`} style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none' }}>
            ✉️ {shop.email}
          </a>
        )}
        {shop.website && (
          <a href={shop.website} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none' }}>
            🌐 {shop.website.replace('https://', '').replace('www.', '')}
          </a>
        )}
        {shop.openingHours && (
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            🕐 {shop.openingHours}
          </div>
        )}
      </div>

      {!shop.verified && (
        <div style={{ fontSize: 10, color: '#B8860B', marginTop: 10, padding: '5px 8px', background: '#fdf8ee', borderRadius: 6 }}>
          ⚠ Contact info unverified — please confirm before visiting
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'

export type ShopCategory = 'all' | 'jeweller' | 'antique-shop' | 'antique-market' | 'dealer' | 'auction' | 'other'

export interface FilterState {
  category: ShopCategory
  search: string
  maxDistance: number
  eras: string[]
}

const CATEGORIES: { id: ShopCategory; label: string; emoji: string }[] = [
  { id: 'all',            label: 'All',            emoji: '🗺' },
  { id: 'jeweller',       label: 'Jewellers',      emoji: '💎' },
  { id: 'antique-shop',   label: 'Antique shops',  emoji: '🏺' },
  { id: 'antique-market', label: 'Markets',        emoji: '🏛' },
  { id: 'dealer',         label: 'Dealers',        emoji: '🔍' },
  { id: 'auction',        label: 'Auction houses', emoji: '🔨' },
]

const DISTANCE_PRESETS = [30, 60, 100, 200]

const ALL_ERAS = [
  'Georgian', 'Victorian', 'Edwardian', 'Art Nouveau',
  'Art Deco', 'Mid-Century', 'Retro', 'Contemporary',
]

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  totalCount: number
  visibleCount: number
}

export default function FilterBar({ filters, onChange, totalCount, visibleCount }: FilterBarProps) {
  const [showEras, setShowEras] = useState(false)

  const set = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial })

  const toggleEra = (era: string) => {
    const next = filters.eras.includes(era)
      ? filters.eras.filter(e => e !== era)
      : [...filters.eras, era]
    set({ eras: next })
  }

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.search.trim() !== '' ||
    filters.maxDistance < 200 ||
    filters.eras.length > 0

  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      borderBottom: '0.5px solid var(--color-border, #e5e5e5)',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 10,
    }}>

      {/* Row 1: search + count */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, pointerEvents: 'none', opacity: 0.5,
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search shops or towns..."
            value={filters.search}
            onChange={e => set({ search: e.target.value })}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              border: '0.5px solid var(--color-border, #e5e5e5)',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              background: 'var(--color-background, #fafafa)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{
          fontSize: 11,
          color: 'var(--color-muted, #888)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {visibleCount === totalCount
            ? `${totalCount} shops`
            : `${visibleCount} / ${totalCount}`}
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => onChange({ category: 'all', search: '', maxDistance: 200, eras: [] })}
            style={{
              fontSize: 11,
              padding: '4px 8px',
              border: '0.5px solid var(--color-border, #e5e5e5)',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-muted, #888)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Row 2: category pills (horizontal scroll on mobile) */}
      <div style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 2,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => set({ category: cat.id })}
            style={{
              flexShrink: 0,
              padding: '5px 11px',
              borderRadius: 20,
              border: filters.category === cat.id
                ? '1.5px solid #1D9E75'
                : '0.5px solid var(--color-border, #e5e5e5)',
              background: filters.category === cat.id ? '#1D9E75' : 'transparent',
              color: filters.category === cat.id ? '#fff' : 'var(--color-text, #333)',
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s',
            }}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Row 3: distance + era toggle */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted, #888)', whiteSpace: 'nowrap' }}>
          Within
        </span>

        {DISTANCE_PRESETS.map(d => (
          <button
            key={d}
            onClick={() => set({ maxDistance: d })}
            style={{
              padding: '3px 9px',
              borderRadius: 6,
              border: filters.maxDistance === d
                ? '1.5px solid #1D9E75'
                : '0.5px solid var(--color-border, #e5e5e5)',
              background: filters.maxDistance === d ? '#edf8f4' : 'transparent',
              color: filters.maxDistance === d ? '#1D9E75' : 'var(--color-muted, #888)',
              fontSize: 11,
              fontFamily: 'inherit',
              cursor: 'pointer',
              fontWeight: filters.maxDistance === d ? 600 : 400,
            }}
          >
            {d}mi
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setShowEras(v => !v)}
          style={{
            fontSize: 11,
            padding: '3px 9px',
            border: filters.eras.length > 0
              ? '1.5px solid #1D9E75'
              : '0.5px solid var(--color-border, #e5e5e5)',
            borderRadius: 6,
            background: filters.eras.length > 0 ? '#edf8f4' : 'transparent',
            color: filters.eras.length > 0 ? '#1D9E75' : 'var(--color-muted, #888)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          Era {filters.eras.length > 0 ? `(${filters.eras.length})` : '▾'}
        </button>
      </div>

      {/* Era picker — expandable */}
      {showEras && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 5,
          paddingTop: 4,
          borderTop: '0.5px solid var(--color-border, #e5e5e5)',
        }}>
          {ALL_ERAS.map(era => (
            <button
              key={era}
              onClick={() => toggleEra(era)}
              style={{
                padding: '3px 10px',
                borderRadius: 20,
                border: filters.eras.includes(era)
                  ? '1.5px solid #B8860B'
                  : '0.5px solid var(--color-border, #e5e5e5)',
                background: filters.eras.includes(era) ? '#fdf8ee' : 'transparent',
                color: filters.eras.includes(era) ? '#B8860B' : 'var(--color-muted, #888)',
                fontSize: 11,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {era}
            </button>
          ))}
        </div>
      )}

    </div>
  )
}

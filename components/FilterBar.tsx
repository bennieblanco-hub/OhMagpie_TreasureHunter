'use client'

export type ShopType = 'all' | 'general' | 'specialist' | 'market'

export interface FilterState {
  shopType: ShopType
  search: string
  maxDistance: number
}

const TYPES: { id: ShopType; label: string; emoji: string }[] = [
  { id: 'all',        label: 'All',           emoji: '🗺' },
  { id: 'specialist', label: 'Jewellers',     emoji: '💎' },
  { id: 'general',    label: 'Antique shops', emoji: '🏺' },
  { id: 'market',     label: 'Markets',       emoji: '🏛' },
]

const DISTANCE_PRESETS = [30, 60, 100, 200]

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  totalCount: number
  visibleCount: number
}

export default function FilterBar({ filters, onChange, totalCount, visibleCount }: FilterBarProps) {
  const set = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial })

  const hasActiveFilters =
    filters.shopType !== 'all' ||
    filters.search.trim() !== '' ||
    filters.maxDistance < 200

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

      {/* Search + count */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', fontSize: 13,
            pointerEvents: 'none', opacity: 0.4,
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
              color: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: 'var(--color-muted, #888)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {visibleCount === totalCount ? `${totalCount} shops` : `${visibleCount} / ${totalCount}`}
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => onChange({ shopType: 'all', search: '', maxDistance: 200 })}
            style={{
              fontSize: 11, padding: '4px 8px',
              border: '0.5px solid var(--color-border, #e5e5e5)',
              borderRadius: 6, background: 'transparent',
              cursor: 'pointer', color: 'var(--color-muted, #888)',
              whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Type pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => set({ shopType: t.id })}
            style={{
              flexShrink: 0,
              padding: '5px 12px',
              borderRadius: 20,
              border: filters.shopType === t.id
                ? '1.5px solid #1D9E75'
                : '0.5px solid var(--color-border, #e5e5e5)',
              background: filters.shopType === t.id ? '#1D9E75' : 'transparent',
              color: filters.shopType === t.id ? '#fff' : 'var(--color-text, #333)',
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Distance presets */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
      </div>

    </div>
  )
}

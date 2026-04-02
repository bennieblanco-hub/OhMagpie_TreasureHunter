'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { FINDS as SEED_FINDS } from '@/lib/data'
import { Shop, Find, SavedSearch, FindStatus, Era, PreferenceProfile } from '@/lib/types'
import { getShops, getFinds, getSearches, updateFindStatus, recordInteractionDB, buildProfileFromDB, toggleSearch } from '@/lib/db'
import { getProfile, recordInteraction, seedProfileFromFinds, scoreFindLocally } from '@/lib/preferences'
import Lightbox from '@/components/Lightbox'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full rounded-xl" style={{ background: 'var(--color-surface)' }}>
      <span className="text-[13px]" style={{ color: 'var(--color-muted)' }}>Loading map…</span>
    </div>
  ),
})

const ERA_STYLES: Record<string, { bg: string; text: string }> = {
  Victorian:     { bg: '#EEEDFE', text: '#3C3489' },
  Georgian:      { bg: '#FAEEDA', text: '#633806' },
  Edwardian:     { bg: '#FBEAF0', text: '#72243E' },
  'Art Deco':    { bg: '#E1F5EE', text: '#085041' },
  'Art Nouveau': { bg: '#EAF3DE', text: '#27500A' },
  Regency:       { bg: '#FAEEDA', text: '#633806' },
  Scottish:      { bg: '#F1EFE8', text: '#444441' },
  General:       { bg: '#F1EFE8', text: '#444441' },
  Modern:        { bg: '#E6F1FB', text: '#0C447C' },
}

function EraTag({ era }: { era: string }) {
  const s = ERA_STYLES[era] || ERA_STYLES.General
  return <span style={{ background: s.bg, color: s.text }} className="inline-block px-1.5 rounded-full text-[10px] mr-1 leading-5">{era}</span>
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 80 ? '#1D9E75' : score >= 60 ? '#B8860B' : '#9e9b93'
  const bg    = score >= 80 ? '#E1F5EE' : score >= 60 ? '#FAEEDA' : '#F1EFE8'
  return <span style={{ background: bg, color }} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium">{score}% match</span>
}

function StatusBadge({ status }: { status: FindStatus }) {
  const styles: Record<FindStatus, string> = {
    New: 'bg-blue-50 text-blue-600', Watching: 'bg-amber-50 text-amber-700',
    Saved: 'bg-green-50 text-green-700', Pass: 'bg-gray-100 text-gray-500',
  }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status]}`}>{status}</span>
}

function MapPanel() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [listQuery, setListQuery] = useState('')
  const [listType, setListType] = useState('')
  const [distFilter, setDistFilter] = useState<number | undefined>(undefined)

  useEffect(() => { getShops().then(d => { setShops(d); setLoading(false) }) }, [])

  const filtered = shops.filter(s => {
  if (distFilter && s.distance > distFilter) return false
  if (listType && (s as any).type !== listType) return false
  const q = listQuery.toLowerCase()
  return !q || s.name.toLowerCase().includes(q) || s.town.toLowerCase().includes(q)
})
  return (
    <div className="flex gap-3 h-[calc(100vh-130px)]">
      <div className="flex-1 min-w-0 rounded-xl overflow-hidden">
        <MapView selectedShop={selectedShop} onSelectShop={setSelectedShop} shops={shops} />
      </div>
      <div className="w-72 flex flex-col gap-2 flex-shrink-0">
        <div className="rounded-xl p-2.5 space-y-1.5" style={{ background: 'var(--color-surface)' }}>
          <input type="text" placeholder="Search shops…" value={listQuery} onChange={e => setListQuery(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border text-[12px] outline-none"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          <div className="flex gap-1.5">
            <select value={listType} onChange={e => setListType(e.target.value)}
  className="flex-1 px-2 py-1.5 rounded-lg border text-[11px] outline-none"
  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
  <option value="">All types</option>
  <option value="specialist">💎 Jewellers</option>
  <option value="general">🏺 Antique shops</option>
  <option value="market">🏛 Markets</option>
</select>
            <select value={distFilter ?? ''} onChange={e => setDistFilter(e.target.value ? parseInt(e.target.value) : undefined)}
              className="flex-1 px-2 py-1.5 rounded-lg border text-[11px] outline-none"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
              <option value="">Any dist</option>
              <option value="30">≤ 30 mi</option>
              <option value="60">≤ 60 mi</option>
              <option value="120">≤ 120 mi</option>
            </select>
          </div>
          <p className="text-[10px] pl-0.5" style={{ color: 'var(--color-muted)' }}>
            {loading ? 'Loading from database…' : `${filtered.length} shops · sorted by distance`}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
          {filtered.map(shop => (
            <button key={shop.id} onClick={() => setSelectedShop(shop === selectedShop ? null : shop)}
              className="w-full text-left rounded-xl p-2.5 border transition-colors"
              style={{
                background: selectedShop?.id === shop.id ? 'var(--color-surface)' : 'var(--color-bg)',
                borderColor: selectedShop?.id === shop.id ? '#1D9E75' : 'var(--color-border)',
              }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate">{shop.name}</div>
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>{shop.town} · {shop.type}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[11px] font-medium">{shop.distance}mi</div>
                  <div className="mt-1 ml-auto rounded-full" style={{ width:6, height:6, background: shop.distance<=30?'#1D9E75':shop.distance<=80?'#B8860B':'#9e9b93' }} />
                </div>
              </div>
              {selectedShop?.id === shop.id && (
                <div className="mt-2 pt-2 border-t text-[10px] space-y-0.5" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                  {shop.phone && <div>📞 {shop.phone}</div>}
                  {shop.email && <div>✉️ {shop.email}</div>}
                  {shop.openingHours && <div>🕐 {shop.openingHours}</div>}
                  {!shop.verified && <div className="mt-1" style={{ color: '#B8860B' }}>⚠ Contact unverified</div>}
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="rounded-xl p-2.5 text-[10px] space-y-1" style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background:'#1D9E75', display:'inline-block' }} />Under 30 mi</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background:'#B8860B', display:'inline-block' }} />30–80 mi</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background:'#6B6A65', display:'inline-block' }} />80+ mi</div>
        </div>
      </div>
    </div>
  )
}

function FindsPanel() {
  const [finds, setFinds] = useState<Find[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<Find | null>(null)
  const [statusFilter, setStatusFilter] = useState<FindStatus | 'all'>('all')
  const [profile, setProfile] = useState<PreferenceProfile | null>(null)

  useEffect(() => {
    getFinds().then(data => { setFinds(data.length > 0 ? data : SEED_FINDS); setLoading(false) })
    buildProfileFromDB().then(p => {
      if (p.totalInteractions === 0) { seedProfileFromFinds(SEED_FINDS); setProfile(getProfile()) }
      else setProfile(p)
    })
  }, [])

  useEffect(() => {
    if (!profile) return
    setFinds(prev => prev.map(f => {
      if (f.interestScore !== undefined) return f
      const { score, reason } = scoreFindLocally(f, profile)
      return { ...f, interestScore: score, interestReason: reason }
    }))
  }, [profile])

  const handleAction = useCallback(async (find: Find, action: 'save' | 'watch' | 'pass') => {
    const map = { save: 'Saved' as FindStatus, watch: 'Watching' as FindStatus, pass: 'Pass' as FindStatus }
    setFinds(prev => prev.map(f => f.id === find.id ? { ...f, status: map[action] } : f))
    await updateFindStatus(find.id, map[action])
    await recordInteractionDB(find, action)
    setProfile(recordInteraction(find, action))
  }, [])

  const filtered = statusFilter === 'all' ? finds : finds.filter(f => f.status === statusFilter)

  if (loading) return <div className="flex items-center justify-center py-20"><span className="text-[13px]" style={{ color: 'var(--color-muted)' }}>Loading finds…</span></div>

  return (
    <>
      {lightbox && <Lightbox find={lightbox} onClose={() => setLightbox(null)} />}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {(['all','New','Watching','Saved','Pass'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} className="px-3 py-1 rounded-full text-[11px] border"
              style={{ borderColor: statusFilter===f?'var(--color-text)':'var(--color-border)', background: statusFilter===f?'var(--color-surface)':'transparent', color: statusFilter===f?'var(--color-text)':'var(--color-muted)' }}>
              {f==='all'?`All (${finds.length})`:`${f} (${finds.filter(x=>x.status===f).length})`}
            </button>
          ))}
        </div>
        <div className="text-[11px]" style={{ color: 'var(--color-muted)' }}>Click image to zoom</div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map(find => (
          <div key={find.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
            <div className="relative aspect-video overflow-hidden cursor-zoom-in" onClick={() => setLightbox(find)} style={{ background: 'var(--color-surface)' }}>
              <img src={find.imageUrl} alt={find.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                <StatusBadge status={find.status} />
                {find.interestScore !== undefined && <ScorePill score={find.interestScore} />}
              </div>
            </div>
            <div className="p-3">
              <div className="text-[13px] font-medium leading-snug mb-1.5">{find.title}</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[15px] font-medium">£{find.price}</span>
                <EraTag era={find.era} />
                <span className="text-[10px] ml-auto" style={{ color: 'var(--color-muted)' }}>{find.platform}</span>
              </div>
              {find.interestReason && <p className="text-[11px] mb-2.5 italic" style={{ color: 'var(--color-muted)' }}>{find.interestReason}</p>}
              <div className="flex gap-1.5">
                {(['save','watch','pass'] as const).map(action => {
                  const isActive = (action==='save'&&find.status==='Saved')||(action==='watch'&&find.status==='Watching')||(action==='pass'&&find.status==='Pass')
                  const c: Record<string,string> = { save:'#1D9E75', watch:'#B8860B', pass:'#9e9b93' }
                  return (
                    <button key={action} onClick={() => handleAction(find, action)}
                      className="flex-1 py-1 rounded-lg text-[11px] border transition-colors"
                      style={{ borderColor: isActive?c[action]:'var(--color-border)', background: isActive?`${c[action]}18`:'transparent', color: isActive?c[action]:'var(--color-muted)', fontWeight: isActive?500:400 }}>
                      {action.charAt(0).toUpperCase()+action.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function SearchesPanel() {
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { getSearches().then(d => { setSearches(d); setLoading(false) }) }, [])

  const handleToggle = async (id: number, active: boolean) => {
    setSearches(prev => prev.map(s => s.id===id ? {...s, active} : s))
    await toggleSearch(id, active)
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {[
          { label:'Active searches',   value: searches.filter(s=>s.active).length },
          { label:'New results today', value: searches.reduce((a,s)=>a+(s.resultsToday??0),0) },
          { label:'Platforms',         value: 2 },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3.5" style={{ background: 'var(--color-surface)' }}>
            <div className="text-[11px] mb-1" style={{ color: 'var(--color-muted)' }}>{s.label}</div>
            <div className="text-[22px] font-medium">{loading?'…':s.value}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {searches.map(s => (
          <div key={s.id} className="rounded-xl border p-3.5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[13px] font-medium">{s.name}</div>
              <div className="flex items-center gap-2">
                {(s.resultsToday??0)>0 && <span className="text-[11px] font-medium" style={{ color:'#1D9E75' }}>{s.resultsToday} new</span>}
                <button onClick={() => handleToggle(s.id, !s.active)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer ${s.active?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>
                  {s.active?'Running':'Paused'}
                </button>
              </div>
            </div>
            <div className="text-[11px] font-mono mb-2.5 leading-relaxed" style={{ color:'var(--color-muted)' }}>{s.keywords.join(' · ')}</div>
            <div className="flex items-center gap-3 text-[11px]" style={{ color:'var(--color-muted)' }}>
              <span className="font-medium" style={{ color:'var(--color-text)' }}>£{s.minPrice}–£{s.maxPrice}</span>
              <span>{s.platforms.join(', ')}</span>
              {s.lastRun && <span className="ml-auto">{s.lastRun}</span>}
            </div>
          </div>
        ))}
        <button className="w-full mt-1 py-2.5 rounded-xl text-[12px] border border-dashed"
          style={{ borderColor:'var(--color-border)', color:'var(--color-muted)' }}>+ New search</button>
      </div>
    </div>
  )
}

function ProfilePanel() {
  const [profile, setProfile] = useState<PreferenceProfile | null>(null)

  useEffect(() => {
    buildProfileFromDB().then(p => {
      if (p.totalInteractions===0) { seedProfileFromFinds(SEED_FINDS); setProfile(getProfile()) }
      else setProfile(p)
    })
  }, [])

  if (!profile) return null

  const topEras = Object.entries(profile.eraScores).sort(([,a],[,b])=>b-a).slice(0,6)
  const topGems = Object.entries(profile.gemstonePreferences).sort(([,a],[,b])=>b-a).slice(0,8)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        {[{label:'Interactions',value:profile.totalInteractions},{label:'Saved',value:profile.savedCount},{label:'Passed',value:profile.passCount}].map(s=>(
          <div key={s.label} className="rounded-xl p-3.5" style={{ background:'var(--color-surface)' }}>
            <div className="text-[11px] mb-1" style={{ color:'var(--color-muted)' }}>{s.label}</div>
            <div className="text-[22px] font-medium">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-4" style={{ borderColor:'var(--color-border)' }}>
        <p className="text-[11px] font-medium uppercase tracking-wider mb-3" style={{ color:'var(--color-muted)' }}>Price range</p>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[22px] font-medium">£{profile.priceRange.avg}</span>
          <span className="text-[13px]" style={{ color:'var(--color-muted)' }}>average save</span>
        </div>
        <div className="text-[12px]" style={{ color:'var(--color-muted)' }}>Range: £{profile.priceRange.min}–£{profile.priceRange.max}</div>
      </div>
      {topEras.length>0 && (
        <div className="rounded-xl border p-4" style={{ borderColor:'var(--color-border)' }}>
          <p className="text-[11px] font-medium uppercase tracking-wider mb-3" style={{ color:'var(--color-muted)' }}>Era preferences</p>
          <div className="space-y-2.5">
            {topEras.map(([era,score])=>(
              <div key={era}>
                <div className="flex justify-between text-[12px] mb-1"><span><EraTag era={era}/></span><span style={{ color:'var(--color-muted)' }}>{Math.round(score*100)}%</span></div>
                <div className="h-1.5 rounded-full" style={{ background:'var(--color-border)' }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width:`${score*100}%`, background:score>0.6?'#1D9E75':score>0.4?'#B8860B':'#9e9b93' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {topGems.length>0 && (
        <div className="rounded-xl border p-4" style={{ borderColor:'var(--color-border)' }}>
          <p className="text-[11px] font-medium uppercase tracking-wider mb-3" style={{ color:'var(--color-muted)' }}>Gemstone preferences</p>
          <div className="grid grid-cols-2 gap-2">
            {topGems.map(([gem,score])=>(
              <div key={gem} className="flex items-center justify-between text-[12px]">
                <span className="capitalize">{gem}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 rounded-full" style={{ background:'var(--color-border)' }}>
                    <div className="h-1.5 rounded-full" style={{ width:`${score*100}%`, background:score>0.6?'#1D9E75':'#9e9b93' }} />
                  </div>
                  <span style={{ color:'var(--color-muted)' }}>{Math.round(score*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {profile.likedKeywords.length>0 && (
        <div className="rounded-xl border p-4" style={{ borderColor:'var(--color-border)' }}>
          <p className="text-[11px] font-medium uppercase tracking-wider mb-3" style={{ color:'var(--color-muted)' }}>Keywords from saves</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.likedKeywords.slice(0,20).map(kw=>(
              <span key={kw} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background:'var(--color-surface)', color:'var(--color-text)' }}>{kw}</span>
            ))}
          </div>
        </div>
      )}
      {profile.totalInteractions<10 && (
        <p className="text-[12px] text-center" style={{ color:'var(--color-muted)' }}>The more you save and pass in Finds, the better this gets.</p>
      )}
    </div>
  )
}

type Tab = 'map' | 'finds' | 'searches' | 'profile'

export default function Home() {
  const [tab, setTab] = useState<Tab>('map')
  const [newCount, setNewCount] = useState(0)

  useEffect(() => {
    getFinds().then(d => setNewCount((d.length>0?d:SEED_FINDS).filter(f=>f.status==='New').length))
  }, [])

  const tabs = [
    { id: 'map'      as Tab, label: 'Map' },
    { id: 'finds'    as Tab, label: 'Finds',    badge: newCount },
    { id: 'searches' as Tab, label: 'Searches' },
    { id: 'profile'  as Tab, label: 'Profile' },
  ]

  return (
    <main className="max-w-6xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <a href="https://instagram.com/ohmagpie" target="_blank" rel="noreferrer"
            className="flex-shrink-0 rounded-lg overflow-hidden block"
            style={{ width:44, height:44, background:'#000' }} title="@ohmagpie on Instagram">
            <img src="/logo.png" alt="OhMagpie" style={{ width:44, height:44, objectFit:'cover' }} />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-medium">OhMagpie</h1>
              <a href="https://instagram.com/ohmagpie" target="_blank" rel="noreferrer"
                className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full border hover:opacity-70 transition-opacity"
                style={{ borderColor:'var(--color-border)', color:'var(--color-muted)', textDecoration:'none' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
                @ohmagpie
              </a>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color:'var(--color-muted)' }}>TreasureHunter · 28 shops · live</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[11px]" style={{ color:'var(--color-muted)' }}>Live</span>
        </div>
      </div>
      <div className="flex gap-1 pb-3.5 border-b mb-4" style={{ borderColor:'var(--color-border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="relative px-3.5 py-1.5 rounded-lg text-[13px] transition-colors"
            style={{ background: tab===t.id?'var(--color-surface)':'transparent', color: tab===t.id?'var(--color-text)':'var(--color-muted)', fontWeight: tab===t.id?500:400 }}>
            {t.label}
            {t.badge!==undefined && t.badge>0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center text-white" style={{ background:'#1D9E75' }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>
      {tab==='map'      && <MapPanel />}
      {tab==='finds'    && <FindsPanel />}
      {tab==='searches' && <SearchesPanel />}
      {tab==='profile'  && <ProfilePanel />}
    </main>
  )
}

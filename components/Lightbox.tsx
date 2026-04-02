'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Find } from '@/lib/types'

interface LightboxProps {
  find: Find
  onClose: () => void
}

export default function Lightbox({ find, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 })

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(4, s + 0.5))
      if (e.key === '-') setScale(s => Math.max(1, s - 0.5))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Reset position when scale goes to 1
  useEffect(() => { if (scale === 1) setPos({ x: 0, y: 0 }) }, [scale])

  const zoomIn  = () => setScale(s => Math.min(4, s + 0.5))
  const zoomOut = () => setScale(s => { const n = Math.max(1, s - 0.5); if (n === 1) setPos({x:0,y:0}); return n })
  const reset   = () => { setScale(1); setPos({ x: 0, y: 0 }) }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
  }, [scale, pos])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    setPos({
      x: dragStart.current.px + e.clientX - dragStart.current.x,
      y: dragStart.current.py + e.clientY - dragStart.current.y,
    })
  }, [dragging])

  const onMouseUp = () => setDragging(false)

  const scoreColor = (score: number) => {
    if (score >= 80) return '#1D9E75'
    if (score >= 60) return '#B8860B'
    return '#9e9b93'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Top bar */}
      <div className="flex items-start justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div className="flex-1 min-w-0 pr-4">
          <h2 className="text-white text-[15px] font-medium leading-snug mb-1">{find.title}</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white text-[18px] font-medium">£{find.price}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: '#ddd' }}>
              {find.era}
            </span>
            <span className="text-[11px]" style={{ color: '#aaa' }}>{find.platform}</span>
            {find.interestScore !== undefined && (
              <span className="text-[12px] font-medium" style={{ color: scoreColor(find.interestScore) }}>
                {find.interestScore}% match
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose}
          className="text-white text-[22px] leading-none ml-4 flex-shrink-0 opacity-70 hover:opacity-100">
          ×
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative"
        style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img
          src={find.imageUrl}
          alt={find.title}
          draggable={false}
          style={{
            maxWidth: '90%',
            maxHeight: '70vh',
            objectFit: 'contain',
            transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`,
            transition: dragging ? 'none' : 'transform 0.2s ease',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-3 py-3 flex-shrink-0">
        <button onClick={zoomOut}
          className="w-9 h-9 rounded-full text-white text-[18px] flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.12)' }}>−</button>
        <span className="text-[12px] text-gray-400 w-12 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn}
          className="w-9 h-9 rounded-full text-white text-[18px] flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.12)' }}>+</button>
        {scale > 1 && (
          <button onClick={reset} className="text-[11px] text-gray-400 underline ml-2">reset</button>
        )}
      </div>

      {/* Bottom info strip */}
      <div className="px-5 pb-5 flex-shrink-0">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-2 gap-4 text-[12px]">
            {find.description && (
              <div className="col-span-2" style={{ color: '#ccc' }}>{find.description}</div>
            )}
            {find.seller && (
              <div><span style={{ color: '#888' }}>Seller</span><br /><span style={{ color: '#ddd' }}>{find.seller}</span></div>
            )}
            {find.condition && (
              <div><span style={{ color: '#888' }}>Condition</span><br /><span style={{ color: '#ddd' }}>{find.condition}</span></div>
            )}
            {find.interestReason && (
              <div className="col-span-2">
                <span style={{ color: '#888' }}>Why it matches</span><br />
                <span style={{ color: find.interestScore && find.interestScore >= 80 ? '#1D9E75' : '#ddd' }}>
                  {find.interestReason}
                </span>
              </div>
            )}
          </div>
          {find.url && (
            <a href={find.url} target="_blank" rel="noreferrer"
              className="mt-3 block text-center text-[12px] py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#ccc' }}>
              View on {find.platform} →
            </a>
          )}
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: '#555' }}>
          Keyboard: +/− to zoom · Escape to close · drag to pan when zoomed
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Wrong password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="text-[28px] font-medium mb-1" style={{ color: 'var(--color-text)' }}>OhMagpie</div>
          <div className="text-[13px]" style={{ color: 'var(--color-muted)' }}>TreasureHunter</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border text-[13px] outline-none"
            style={{ borderColor: error ? '#e53e3e' : 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white disabled:opacity-50"
            style={{ background: '#1D9E75' }}>
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}

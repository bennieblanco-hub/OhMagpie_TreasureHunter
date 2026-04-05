import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const sitePassword = process.env.SITE_PASSWORD

  if (!sitePassword) {
    // No password configured — allow access
    const res = NextResponse.json({ ok: true })
    res.cookies.set('ohmagpie-auth', 'open', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
    return res
  }

  if (password === sitePassword) {
    const token = Buffer.from(`${Date.now()}:${sitePassword}`).toString('base64')
    const res = NextResponse.json({ ok: true })
    res.cookies.set('ohmagpie-auth', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
    return res
  }

  return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
}

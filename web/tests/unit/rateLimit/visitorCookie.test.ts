import { describe, expect, it } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  VISITOR_COOKIE_NAME,
  attachVisitorCookie,
  getOrCreateVisitorId,
  readVisitorId,
} from '@/lib/rateLimit/visitorCookie'

function requestWithCookie(value?: string): NextRequest {
  return new NextRequest('http://localhost/api/feed/sessions', {
    headers: value ? { cookie: `${VISITOR_COOKIE_NAME}=${value}` } : {},
  })
}

describe('readVisitorId / getOrCreateVisitorId', () => {
  it('lee el visitorId existente de la cookie', () => {
    expect(readVisitorId(requestWithCookie('abc-123'))).toBe('abc-123')
    expect(getOrCreateVisitorId(requestWithCookie('abc-123'))).toBe('abc-123')
  })

  it('sin cookie, readVisitorId devuelve null y getOrCreateVisitorId genera uno nuevo', () => {
    expect(readVisitorId(requestWithCookie())).toBeNull()

    const generated = getOrCreateVisitorId(requestWithCookie())
    expect(typeof generated).toBe('string')
    expect(generated.length).toBeGreaterThan(0)
  })

  it('genera un valor distinto en cada llamada sin cookie (no reutiliza el mismo id para dos visitantes)', () => {
    const a = getOrCreateVisitorId(requestWithCookie())
    const b = getOrCreateVisitorId(requestWithCookie())
    expect(a).not.toBe(b)
  })
})

describe('attachVisitorCookie', () => {
  it('escribe la cookie con httpOnly, sameSite=lax y 24h de Max-Age', () => {
    const response = NextResponse.json({ ok: true })
    attachVisitorCookie(response, 'visitor-xyz')

    const cookie = response.cookies.get(VISITOR_COOKIE_NAME)
    expect(cookie?.value).toBe('visitor-xyz')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(cookie?.maxAge).toBe(60 * 60 * 24)
    expect(cookie?.path).toBe('/')
  })
})

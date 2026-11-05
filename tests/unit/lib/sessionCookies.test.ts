import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  hardenSessionCookie,
  SESSION_COOKIE_MAX_AGE_SECONDS,
} from '@/lib/supabase/sessionCookies'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('hardenSessionCookie (SEC-X-1a)', () => {
  it('marca la cookie como httpOnly aunque Supabase la pida legible', () => {
    expect(hardenSessionCookie({ httpOnly: false }).httpOnly).toBe(true)
    expect(hardenSessionCookie().httpOnly).toBe(true)
  })

  it('recorta los 400 días por defecto de Supabase a la vida máxima', () => {
    const cookie = hardenSessionCookie({ maxAge: 400 * 24 * 60 * 60 })

    expect(cookie.maxAge).toBe(SESSION_COOKIE_MAX_AGE_SECONDS)
    expect(SESSION_COOKIE_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60)
  })

  it('sin maxAge usa la vida máxima', () => {
    expect(hardenSessionCookie({}).maxAge).toBe(SESSION_COOKIE_MAX_AGE_SECONDS)
  })

  it('NO pisa maxAge 0: así sigue funcionando el borrado al cerrar sesión', () => {
    expect(hardenSessionCookie({ maxAge: 0 }).maxAge).toBe(0)
  })

  it('respeta un maxAge menor que el máximo', () => {
    expect(hardenSessionCookie({ maxAge: 60 }).maxAge).toBe(60)
  })

  it('conserva path y sameSite que ponga Supabase', () => {
    const cookie = hardenSessionCookie({ path: '/', sameSite: 'lax' })

    expect(cookie.path).toBe('/')
    expect(cookie.sameSite).toBe('lax')
  })

  it('en producción añade secure', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(hardenSessionCookie({}).secure).toBe(true)
  })

  it('fuera de producción no fuerza secure (desarrollo en http)', () => {
    vi.stubEnv('NODE_ENV', 'development')

    expect(hardenSessionCookie({}).secure).toBeUndefined()
  })
})

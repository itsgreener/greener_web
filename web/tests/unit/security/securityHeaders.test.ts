import { describe, it, expect } from 'vitest'

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from '@/lib/securityHeaders'

const INPUT = {
  nonce: 'test-nonce-123',
  supabaseUrl: 'https://abcxyz.supabase.co',
  isDev: false,
}

describe('buildContentSecurityPolicy', () => {
  it('script-src lleva el nonce exacto y strict-dynamic, nunca unsafe-inline', () => {
    const csp = buildContentSecurityPolicy(INPUT)

    expect(csp).toContain(
      `script-src 'self' 'nonce-test-nonce-123' 'strict-dynamic'`,
    )
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
  })

  it('style-src sí lleva unsafe-inline a propósito (atributos style= del masonry, no cubiertos por nonce)', () => {
    const csp = buildContentSecurityPolicy(INPUT)

    expect(csp).toContain(`style-src 'self' 'unsafe-inline'`)
  })

  it('connect-src incluye el origen real de Supabase (dinámico) y la subida directa de Cloudinary', () => {
    const csp = buildContentSecurityPolicy(INPUT)

    expect(csp).toContain(
      `connect-src 'self' https://abcxyz.supabase.co https://api.cloudinary.com`,
    )
  })

  it('connect-src usa solo el origen de Supabase, sin arrastrar query/path si la URL los trajera', () => {
    const csp = buildContentSecurityPolicy({
      ...INPUT,
      supabaseUrl: 'https://abcxyz.supabase.co/algo?token=1',
    })

    expect(csp).toContain(
      "connect-src 'self' https://abcxyz.supabase.co https://api.cloudinary.com",
    )
  })

  it('img-src y media-src incluyen res.cloudinary.com (portadas, carrusel, pines y vídeo — sin next/image de por medio)', () => {
    const csp = buildContentSecurityPolicy(INPUT)

    expect(csp).toContain(`img-src 'self' data: https://res.cloudinary.com`)
    expect(csp).toContain(`media-src 'self' https://res.cloudinary.com`)
  })

  it('frame-src incluye los tres proveedores de embed de episodio', () => {
    const csp = buildContentSecurityPolicy(INPUT)

    expect(csp).toContain('https://www.youtube-nocookie.com')
    expect(csp).toContain('https://player.vimeo.com')
    expect(csp).toContain('https://open.spotify.com')
  })

  it('frame-ancestors none — el sitio nunca se embebe a sí mismo en ningún sitio', () => {
    expect(buildContentSecurityPolicy(INPUT)).toContain(
      `frame-ancestors 'none'`,
    )
  })

  it('dos nonces distintos producen dos CSP distintas (no hay valor cacheado a fuego)', () => {
    const a = buildContentSecurityPolicy({ ...INPUT, nonce: 'nonce-a' })
    const b = buildContentSecurityPolicy({ ...INPUT, nonce: 'nonce-b' })

    expect(a).not.toBe(b)
    expect(a).toContain('nonce-nonce-a')
    expect(b).toContain('nonce-nonce-b')
  })

  it('isDev=false (producción): script-src nunca lleva unsafe-eval — "React will never use eval() en producción"', () => {
    const csp = buildContentSecurityPolicy({ ...INPUT, isDev: false })

    expect(csp).not.toMatch(/script-src[^;]*unsafe-eval/)
  })

  it('isDev=true (desarrollo): script-src sí lleva unsafe-eval, para que React pueda reconstruir callstacks y Fast Refresh funcione', () => {
    const csp = buildContentSecurityPolicy({ ...INPUT, isDev: true })

    expect(csp).toMatch(/script-src[^;]*unsafe-eval/)
    // Sigue llevando el nonce y strict-dynamic también en dev — unsafe-eval
    // se añade, no sustituye al resto de la directiva.
    expect(csp).toContain(`'nonce-${INPUT.nonce}'`)
    expect(csp).toContain(`'strict-dynamic'`)
  })
})

describe('buildSecurityHeaders', () => {
  it('trae las cuatro cabeceras globales, ninguna vacía', () => {
    const headers = buildSecurityHeaders(INPUT)

    expect(headers['Content-Security-Policy']).toBeTruthy()
    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=63072000; includeSubDomains; preload',
    )
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })
})

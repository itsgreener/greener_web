import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type FakeSupabaseClient = {
  auth: {
    getClaims: () => Promise<{
      data: { claims: Record<string, unknown> } | null
      error: Error | null
    }>
  }
  rpc: (fn: string) => Promise<{ data: boolean | null; error: Error | null }>
}

let fakeClient: FakeSupabaseClient

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => fakeClient),
}))

function makeRequest(pathname: string) {
  return new NextRequest(new URL(pathname, 'http://localhost:3000').toString())
}

function withClaims(hasClaims: boolean) {
  fakeClient.auth.getClaims = vi
    .fn()
    .mockResolvedValue(
      hasClaims
        ? { data: { claims: { email: 'persona@itsgreener.com' } }, error: null }
        : { data: null, error: new Error('no session') },
    )
}

function withAdmin(isAdmin: boolean) {
  fakeClient.rpc = vi.fn().mockResolvedValue({ data: isAdmin, error: null })
}

beforeEach(() => {
  fakeClient = {
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  }
})

describe('proxy — rutas /app de tools/insights/variety (contrato-zip-tools-insights.md §12.4)', () => {
  it.each([
    '/tools/mi-tool/app',
    '/tools/mi-tool/app/',
    '/tools/mi-tool/app/assets/main.js',
    '/insights/mi-insight/app',
    '/insights/mi-insight/app/assets/style.css',
    '/variety/mi-pagina/app',
    '/variety/mi-pagina/app/',
    '/variety/mi-pagina/app/assets/main.js',
  ])(
    '%s pasa sin ninguna cabecera de seguridad global añadida',
    async (pathname) => {
      const { proxy } = await import('@/proxy')

      const response = await proxy(makeRequest(pathname))

      expect(response.headers.get('Content-Security-Policy')).toBeNull()
      expect(response.headers.get('Strict-Transport-Security')).toBeNull()
    },
  )

  it('una ruta de detalle real (sin /app) sí lleva las cabeceras — el patrón no es demasiado ancho', async () => {
    const { proxy } = await import('@/proxy')

    const response = await proxy(makeRequest('/tools/mi-tool'))

    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('/variety/[slug] (la redirección a /app) sí lleva las cabeceras globales', async () => {
    const { proxy } = await import('@/proxy')

    const response = await proxy(makeRequest('/variety/mi-pagina'))

    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
  })
})

describe('proxy — cabeceras globales en rutas públicas normales', () => {
  it.each([
    '/',
    '/work',
    '/tools',
    '/insights',
    '/channel',
    '/contact',
    '/privacy',
    '/variety/algo',
  ])('%s lleva las cuatro cabeceras de seguridad', async (pathname) => {
    const { proxy } = await import('@/proxy')

    const response = await proxy(makeRequest(pathname))

    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
    expect(response.headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload',
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin',
    )
  })

  it('el nonce del script-src cambia en cada request', async () => {
    const { proxy } = await import('@/proxy')

    const cspA = (await proxy(makeRequest('/'))).headers.get(
      'Content-Security-Policy',
    )
    const cspB = (await proxy(makeRequest('/'))).headers.get(
      'Content-Security-Policy',
    )

    expect(cspA).not.toBe(cspB)
  })

  it('script-src nunca lleva unsafe-inline; style-src sí, a propósito', async () => {
    const { proxy } = await import('@/proxy')

    const csp = (await proxy(makeRequest('/'))).headers.get(
      'Content-Security-Policy',
    )

    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(csp).toMatch(/style-src[^;]*unsafe-inline/)
  })
})

describe('proxy — rutas de admin: la verificación de dominio (§15.2) sigue intacta, con cabeceras de más', () => {
  it('sin JWT válido en /admin/contents, sigue redirigiendo a /admin/login — y ahora también lleva CSP', async () => {
    const { proxy } = await import('@/proxy')

    withClaims(false)

    const response = await proxy(makeRequest('/admin/contents'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/admin/login')
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('sin JWT válido en /api/admin/*, sigue devolviendo 401 JSON — y también lleva CSP', async () => {
    const { proxy } = await import('@/proxy')

    withClaims(false)

    const response = await proxy(makeRequest('/api/admin/media/sign'))

    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('con JWT válido pero dominio no autorizado, sigue redirigiendo con ?error=unauthorized — y lleva CSP', async () => {
    const { proxy } = await import('@/proxy')

    withClaims(true)
    withAdmin(false)

    const response = await proxy(makeRequest('/admin/contents'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('error=unauthorized')
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('con sesión admin válida, deja pasar (200) con las cabeceras globales puestas', async () => {
    const { proxy } = await import('@/proxy')

    withClaims(true)
    withAdmin(true)

    const response = await proxy(makeRequest('/admin/contents'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
    expect(response.headers.get('Strict-Transport-Security')).toBeTruthy()
  })
})

// SEC-T3: tabla de rutas del apartado 4.1 de la auditoría de seguridad.
describe('proxy — qué rutas son del ABM (SEC-ADM-A4)', () => {
  it.each([
    '/admin',
    '/admin/contents',
    '/admin/../admin',
    '/./admin',
    '/%2e/admin',
    '/admin%2f',
    '/admin;x',
  ])('%s sin sesión redirige al login del ABM', async (pathname) => {
    const { proxy } = await import('@/proxy')

    const response = await proxy(makeRequest(pathname))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/admin/login')
  })

  it.each(['/api/admin/media/sign', '/api/admin/talent/cv'])(
    '%s sin sesión responde 401 en JSON',
    async (pathname) => {
      const { proxy } = await import('@/proxy')

      const response = await proxy(makeRequest(pathname))

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'No autenticado' })
    },
  )

  it.each(['/administrator', '/administracion', '/admin-panel'])(
    '%s ya no se trata como el ABM: no redirige al login',
    async (pathname) => {
      const { proxy } = await import('@/proxy')

      const response = await proxy(makeRequest(pathname))

      expect(response.headers.get('location')).toBeNull()
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
    },
  )
})

describe('proxy — Permissions-Policy y aislamiento de ventana (SEC-ADM-E1)', () => {
  it('las rutas públicas llevan Permissions-Policy y no el COOP del ABM', async () => {
    const { proxy } = await import('@/proxy')

    const response = await proxy(makeRequest('/contact'))

    expect(response.headers.get('Permissions-Policy')).toContain('camera=()')
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBeNull()
  })

  it.each(['/admin', '/admin/login', '/api/admin/media/sign'])(
    '%s lleva COOP same-origin y Permissions-Policy',
    async (pathname) => {
      const { proxy } = await import('@/proxy')

      const response = await proxy(makeRequest(pathname))

      expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe(
        'same-origin',
      )
      expect(response.headers.get('Permissions-Policy')).toContain(
        'microphone=()',
      )
    },
  )
})

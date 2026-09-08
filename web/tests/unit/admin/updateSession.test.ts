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

describe('updateSession', () => {
  it('/admin/login es accesible sin sesión — no redirige aunque no haya claims', async () => {
    const { updateSession } = await import('@/lib/supabase/proxy')

    withClaims(false)

    const response = await updateSession(makeRequest('/admin/login'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('sin JWT válido en una ruta de página, redirige a /admin/login', async () => {
    const { updateSession } = await import('@/lib/supabase/proxy')

    withClaims(false)

    const response = await updateSession(makeRequest('/admin/contents'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/admin/login')
  })

  it('sin JWT válido en una ruta /api/admin/*, devuelve JSON 401 en vez de redirigir', async () => {
    const { updateSession } = await import('@/lib/supabase/proxy')

    withClaims(false)

    const response = await updateSession(makeRequest('/api/admin/media/sign'))

    expect(response.status).toBe(401)
    expect(response.headers.get('location')).toBeNull()

    const body = await response.json()
    expect(body.error).toBeTruthy()
  })

  it('con JWT válido pero dominio no autorizado en una ruta de página, redirige con ?error=unauthorized', async () => {
    const { updateSession } = await import('@/lib/supabase/proxy')

    withClaims(true)
    withAdmin(false)

    const response = await updateSession(makeRequest('/admin/contents'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/admin/login')
    expect(response.headers.get('location')).toContain('error=unauthorized')
  })

  it('con JWT válido pero dominio no autorizado en una ruta /api/admin/*, devuelve JSON 403', async () => {
    const { updateSession } = await import('@/lib/supabase/proxy')

    withClaims(true)
    withAdmin(false)

    const response = await updateSession(
      makeRequest('/api/admin/media/sign-video'),
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('location')).toBeNull()
  })

  it('con JWT válido y dominio autorizado, deja pasar sin redirigir (página)', async () => {
    const { updateSession } = await import('@/lib/supabase/proxy')

    withClaims(true)
    withAdmin(true)

    const response = await updateSession(makeRequest('/admin/contents'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('con JWT válido y dominio autorizado, deja pasar sin redirigir (API)', async () => {
    const { updateSession } = await import('@/lib/supabase/proxy')

    withClaims(true)
    withAdmin(true)

    const response = await updateSession(makeRequest('/api/admin/media/sign'))

    expect(response.status).toBe(200)
  })

  it('un error al consultar is_admin() se trata igual que "no admin", nunca se abre en fallo', async () => {
    const { updateSession } = await import('@/lib/supabase/proxy')

    withClaims(true)
    fakeClient.rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('db down') })

    const response = await updateSession(makeRequest('/admin/contents'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/admin/login')
  })
})

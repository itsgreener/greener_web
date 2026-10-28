import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NextRequest } from 'next/server'

type CookiesOption = {
  getAll: () => unknown[]
  setAll: (
    cookies: {
      name: string
      value: string
      options: Record<string, unknown>
    }[],
  ) => void
}

let captured: CookiesOption | undefined
let refreshCookies: Parameters<CookiesOption['setAll']>[0] | undefined
const stored: { name: string; value: string; options: unknown }[] = []

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(
    (_url: string, _key: string, opts: { cookies: CookiesOption }) => {
      captured = opts.cookies

      return {
        auth: {
          getClaims: vi.fn(async () => {
            if (refreshCookies) opts.cookies.setAll(refreshCookies)

            return { data: null, error: null }
          }),
        },
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      }
    },
  ),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: (name: string, value: string, options: unknown) => {
      stored.push({ name, value, options })
    },
  })),
}))

const SUPABASE_DEFAULT = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: false,
  maxAge: 400 * 24 * 60 * 60,
}

beforeEach(() => {
  captured = undefined
  refreshCookies = undefined
  stored.length = 0
})

// SEC-T9: las cookies de sesión de Supabase salen httpOnly en los dos
// puntos donde el servidor las escribe.
describe('cookies de sesión de Supabase (SEC-X-1a)', () => {
  it('lib/supabase/server.ts escribe las cookies httpOnly y con vida máxima de 7 días', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    await createClient()
    captured!.setAll([
      { name: 'sb-x-auth-token', value: 'jwt', options: SUPABASE_DEFAULT },
    ])

    expect(stored).toHaveLength(1)
    expect(stored[0].options).toMatchObject({
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
  })

  it('lib/supabase/server.ts conserva el borrado (maxAge 0) al cerrar sesión', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    await createClient()
    captured!.setAll([
      {
        name: 'sb-x-auth-token',
        value: '',
        options: { ...SUPABASE_DEFAULT, maxAge: 0 },
      },
    ])

    expect(stored[0].options).toMatchObject({ httpOnly: true, maxAge: 0 })
  })

  it('lib/supabase/proxy.ts escribe las cookies de la respuesta httpOnly y con vida máxima de 7 días', async () => {
    // Al refrescar el token, Supabase llama a setAll durante getClaims.
    refreshCookies = [
      { name: 'sb-x-auth-token', value: 'jwt', options: SUPABASE_DEFAULT },
    ]

    const { updateSession } = await import('@/lib/supabase/proxy')

    const response = await updateSession(
      new NextRequest('http://localhost:3000/admin/login'),
    )

    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(setCookie).toContain('sb-x-auth-token=jwt')
    expect(setCookie).toMatch(/httponly/i)
    expect(setCookie).toContain('Max-Age=604800')
  })
})

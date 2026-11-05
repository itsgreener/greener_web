// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import {
  PKCE_COOKIE_MAX_AGE_SECONDS,
  createBrowserCookieAdapter,
  hardenBrowserCookie,
  isPkceFlowCookie,
  parseBrowserCookies,
  serializeBrowserCookie,
} from '@/lib/supabase/browserCookies'

const KEY = 'sb-abcdefghijklmnopqrst-auth-token'
const FLOW_ID = 'AbCdEfGh12345678'

/** Borra todas las cookies de jsdom entre pruebas. */
afterEach(() => {
  for (const { name } of parseBrowserCookies(document.cookie)) {
    document.cookie = `${name}=; Max-Age=0; Path=/`
  }
})

describe('SEC-X-1a: cookies del flujo PKCE', () => {
  it.each([
    `${KEY}-code-verifier`,
    `${KEY}-flows-code-verifier`,
    `${KEY}-flow-${FLOW_ID}-code-verifier`,
    `${KEY}-flow-${FLOW_ID}`,
  ])('%s se reconoce como del flujo', (name) => {
    expect(isPkceFlowCookie(name)).toBe(true)
  })

  it.each([KEY, `${KEY}.0`, `${KEY}.1`, 'greener_visitor', 'consent'])(
    '%s no es del flujo (la sesión no se acorta)',
    (name) => {
      expect(isPkceFlowCookie(name)).toBe(false)
    },
  )

  it('las del flujo bajan de 400 días a 10 minutos', () => {
    const options = hardenBrowserCookie(
      `${KEY}-code-verifier`,
      { maxAge: 400 * 24 * 60 * 60, path: '/', sameSite: 'lax' },
      true,
    )

    expect(options.maxAge).toBe(PKCE_COOKIE_MAX_AGE_SECONDS)
    expect(PKCE_COOKIE_MAX_AGE_SECONDS).toBe(600)
  })

  it('sin maxAge propio también reciben los 10 minutos', () => {
    expect(
      hardenBrowserCookie(`${KEY}-flows-code-verifier`, {}, true).maxAge,
    ).toBe(600)
  })

  it('el borrado (maxAge 0) no se alarga', () => {
    expect(
      hardenBrowserCookie(`${KEY}-code-verifier`, { maxAge: 0 }, true).maxAge,
    ).toBe(0)
  })

  it('una cookie que no es del flujo conserva su vida', () => {
    expect(hardenBrowserCookie(KEY, { maxAge: 1234 }, true).maxAge).toBe(1234)
  })

  it('en HTTPS todas llevan Secure; en HTTP no se fuerza (desarrollo local)', () => {
    expect(hardenBrowserCookie(KEY, {}, true).secure).toBe(true)
    expect(hardenBrowserCookie(`${KEY}-code-verifier`, {}, true).secure).toBe(
      true,
    )
    expect(hardenBrowserCookie(KEY, {}, false).secure).toBeUndefined()
  })

  it('nunca se marca HttpOnly: JavaScript no puede crear esa cookie', () => {
    expect(
      serializeBrowserCookie(
        `${KEY}-code-verifier`,
        'v',
        hardenBrowserCookie(`${KEY}-code-verifier`, {}, true),
      ),
    ).not.toMatch(/HttpOnly/i)
  })
})

describe('serialización y lectura de document.cookie', () => {
  it('serializa maxAge, ruta, SameSite y Secure', () => {
    expect(
      serializeBrowserCookie('a', 'x y', {
        maxAge: 600.9,
        path: '/',
        sameSite: 'lax',
        secure: true,
      }),
    ).toBe('a=x%20y; Max-Age=600; Path=/; SameSite=Lax; Secure')
  })

  it('sin ruta usa /, y acepta dominio y caducidad', () => {
    const text = serializeBrowserCookie('a', 'b', {
      domain: 'itsgreener.com',
      expires: new Date(Date.UTC(2030, 0, 1)),
    })

    expect(text).toContain('Domain=itsgreener.com')
    expect(text).toContain('Path=/')
    expect(text).toContain('Expires=Tue, 01 Jan 2030 00:00:00 GMT')
  })

  it('lee las cookies decodificando el valor y salta las mal formadas', () => {
    expect(
      parseBrowserCookies('a=1; b=x%20y; =raro; suelta; c=%E0%A4%A'),
    ).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: 'x y' },
      { name: 'c', value: '%E0%A4%A' },
    ])
  })
})

describe('createBrowserCookieAdapter', () => {
  it('escribe y vuelve a leer una cookie normal', () => {
    const adapter = createBrowserCookieAdapter()

    adapter.setAll([{ name: 'prueba', value: 'a b', options: { path: '/' } }])

    expect(adapter.getAll()).toContainEqual({ name: 'prueba', value: 'a b' })
  })

  it('el borrado (maxAge 0) quita la cookie', () => {
    const adapter = createBrowserCookieAdapter()

    adapter.setAll([{ name: 'temporal', value: '1', options: { path: '/' } }])
    adapter.setAll([
      { name: 'temporal', value: '', options: { path: '/', maxAge: 0 } },
    ])

    expect(adapter.getAll().some((c) => c.name === 'temporal')).toBe(false)
  })

  it('una cookie del flujo se escribe con Max-Age de 10 minutos', () => {
    const writes: string[] = []
    const original = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'cookie',
    )!

    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => original.get!.call(document),
      set: (value: string) => {
        writes.push(value)
        original.set!.call(document, value)
      },
    })

    try {
      createBrowserCookieAdapter().setAll([
        {
          name: `${KEY}-code-verifier`,
          value: 'verificador',
          options: { maxAge: 400 * 24 * 60 * 60, path: '/', sameSite: 'lax' },
        },
      ])
    } finally {
      delete (document as unknown as { cookie?: string }).cookie
    }

    expect(writes).toHaveLength(1)
    expect(writes[0]).toContain('Max-Age=600')
    expect(writes[0]).not.toContain('Max-Age=34560000')
  })
})

describe('el cliente de navegador usa el adaptador', () => {
  it('createClient pasa las cookies propias a createBrowserClient', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync('src/lib/supabase/client.ts', 'utf8')

    expect(source).toContain('createBrowserCookieAdapter()')
  })
})

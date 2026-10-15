import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * GET /api/feed/{sessionId} con el límite de 50 lotes por minuto
 * (§2.16, 29 sep). Al superarlo, responde como fin de catálogo
 * (hasMore: false) en vez de un error — el cliente (useFeed.ts) ya sabe
 * parar ante eso.
 */

const getFeedSessionBatch = vi.fn()

function requestWithCookie(visitorId?: string): NextRequest {
  return new NextRequest('http://localhost/api/feed/session-1', {
    headers: visitorId ? { cookie: `greener_visitor=${visitorId}` } : {},
  })
}

function requestWithQuery(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/feed/session-1?${query}`, {
    headers: { cookie: 'greener_visitor=visitor-size' },
  })
}

const SESSION_ID = '5f0c2b7e-1d2a-4c3b-9e4f-0a1b2c3d4e5f'

const params = {
  params: Promise.resolve({
    sessionId: SESSION_ID,
  }),
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  // Los límites son los reales (estado de módulo, fresco tras resetModules);
  // solo se sustituye el caso de uso, que tocaría Supabase.
  vi.doMock('@/modules/feed/container', async () => {
    const { inMemoryFeedRequestLimits } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    return {
      feedLimits: inMemoryFeedRequestLimits,
      getFeedSessionBatch: (...args: unknown[]) => getFeedSessionBatch(...args),
    }
  })
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-29T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/feed/{sessionId} — límite de 50 lotes por minuto', () => {
  it('las primeras 50 peticiones generan lote de verdad', async () => {
    getFeedSessionBatch.mockResolvedValue({
      items: [{ pinId: 'x' }],
      cursor: 'c',
      hasMore: true,
    })
    const { GET } = await import('@/app/api/feed/[sessionId]/route')

    for (let i = 0; i < 50; i++) {
      const response = await GET(requestWithCookie('visitor-1'), params)
      expect(response.status).toBe(200)
    }

    expect(getFeedSessionBatch).toHaveBeenCalledTimes(50)
  })

  it('la 51ª NO genera ronda: responde como fin de catálogo, sin error visible', async () => {
    getFeedSessionBatch.mockResolvedValue({
      items: [{ pinId: 'x' }],
      cursor: 'c',
      hasMore: true,
    })
    const { GET } = await import('@/app/api/feed/[sessionId]/route')

    for (let i = 0; i < 50; i++) {
      await GET(requestWithCookie('visitor-1'), params)
    }

    const response = await GET(requestWithCookie('visitor-1'), params)
    const body = (await response.json()) as {
      items: unknown[]
      hasMore: boolean
      rateLimited?: boolean
    }

    expect(response.status).toBe(200)
    // hasMore: true a propósito (bug real corregido el 30 sep, §2.19):
    // SÍ hay más, solo que no ahora mismo — `rateLimited` es la señal
    // real para que el cliente no lo confunda con "sin contenido" y
    // corte el scroll para siempre. Ver FeedProvider.test.ts.
    expect(body).toEqual({
      items: [],
      cursor: '',
      round: 0,
      batch: 0,
      hasMore: true,
      rateLimited: true,
    })
    expect(getFeedSessionBatch).toHaveBeenCalledTimes(50) // no una 51ª
  })

  it('un visitante distinto no se ve afectado por el límite del otro', async () => {
    getFeedSessionBatch.mockResolvedValue({
      items: [],
      cursor: 'c',
      hasMore: true,
    })
    const { GET } = await import('@/app/api/feed/[sessionId]/route')

    for (let i = 0; i < 50; i++) {
      await GET(requestWithCookie('visitor-1'), params)
    }

    const response = await GET(requestWithCookie('visitor-2'), params)
    expect(getFeedSessionBatch).toHaveBeenCalledTimes(51)
    expect(response.status).toBe(200)
  })

  it('sigue mandando la cookie de visitante en la respuesta, también cuando está limitada', async () => {
    getFeedSessionBatch.mockResolvedValue({
      items: [],
      cursor: 'c',
      hasMore: true,
    })
    const { GET } = await import('@/app/api/feed/[sessionId]/route')

    for (let i = 0; i < 50; i++) {
      await GET(requestWithCookie('visitor-1'), params)
    }

    const response = await GET(requestWithCookie('visitor-1'), params)
    expect(response.headers.get('set-cookie')).toContain(
      'greener_visitor=visitor-1',
    )
  })

  it('pasado un minuto completo, el cupo se reinicia', async () => {
    getFeedSessionBatch.mockResolvedValue({
      items: [],
      cursor: 'c',
      hasMore: true,
    })
    const { GET } = await import('@/app/api/feed/[sessionId]/route')

    for (let i = 0; i < 50; i++) {
      await GET(requestWithCookie('visitor-1'), params)
    }
    await GET(requestWithCookie('visitor-1'), params) // consume el 51º, limitado

    vi.setSystemTime(new Date('2026-09-29T10:01:00Z'))

    await GET(requestWithCookie('visitor-1'), params)
    expect(getFeedSessionBatch).toHaveBeenCalledTimes(51)
  })
})

describe('validación del sessionId (auditoría 8 oct)', () => {
  it('un sessionId que no es uuid da 404 sin llegar a Postgres', async () => {
    const { GET } = await import('@/app/api/feed/[sessionId]/route')

    const response = await GET(requestWithCookie(), {
      params: Promise.resolve({ sessionId: 'no-es-uuid' }),
    })

    expect(response.status).toBe(404)
    expect(getFeedSessionBatch).not.toHaveBeenCalled()
  })
})

describe('GET /api/feed/{sessionId} — parámetro size', () => {
  async function sizeSeenBy(query: string) {
    getFeedSessionBatch.mockResolvedValue({
      items: [{ pinId: 'x' }],
      cursor: 'c',
      round: 0,
      batch: 0,
      hasMore: true,
    })
    const { GET } = await import('@/app/api/feed/[sessionId]/route')
    await GET(requestWithQuery(query), params)
    return getFeedSessionBatch.mock.calls[0][2]
  }

  it('pasa al caso de uso el tamaño que pide el cliente (móvil: 20)', async () => {
    expect(await sizeSeenBy('size=20')).toBe(20)
  })

  it('sin size, o con un valor que no es un entero positivo, no pide tamaño (se usa el configurado)', async () => {
    expect(await sizeSeenBy('cursor=abc')).toBeNull()
    vi.clearAllMocks()
    expect(await sizeSeenBy('size=abc')).toBeNull()
    vi.clearAllMocks()
    expect(await sizeSeenBy('size=-5')).toBeNull()
    vi.clearAllMocks()
    expect(await sizeSeenBy('size=1.5')).toBeNull()
  })
})

describe('GET /api/feed/{sessionId} — cookie de newsletter', () => {
  function requestWithCookies(cookie: string): NextRequest {
    return new NextRequest('http://localhost/api/feed/session-1', {
      headers: { cookie },
    })
  }

  beforeEach(() => {
    getFeedSessionBatch.mockResolvedValue({
      items: [],
      cursor: 'c',
      hasMore: true,
    })
  })

  it('sin cookie, el visitante no está suscrito', async () => {
    const { GET } = await import('@/app/api/feed/[sessionId]/route')
    await GET(requestWithCookie('visitor-1'), params)

    expect(getFeedSessionBatch).toHaveBeenCalledWith(SESSION_ID, null, null, {
      newsletterSubscribed: false,
    })
  })

  it('con greener_newsletter=1, el caso de uso omite la newsletter', async () => {
    const { GET } = await import('@/app/api/feed/[sessionId]/route')
    await GET(
      requestWithCookies('greener_visitor=visitor-1; greener_newsletter=1'),
      params,
    )

    expect(getFeedSessionBatch).toHaveBeenCalledWith(SESSION_ID, null, null, {
      newsletterSubscribed: true,
    })
  })

  it('cualquier otro valor de la cookie no cuenta como suscrito', async () => {
    const { GET } = await import('@/app/api/feed/[sessionId]/route')
    await GET(
      requestWithCookies('greener_visitor=visitor-1; greener_newsletter=0'),
      params,
    )

    expect(getFeedSessionBatch).toHaveBeenCalledWith(SESSION_ID, null, null, {
      newsletterSubscribed: false,
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * GET /api/feed/{sessionId} con el límite de 50 lotes por minuto
 * (§2.16, 29 sep). Al superarlo, responde como fin de catálogo
 * (hasMore: false) en vez de un error — el cliente (useFeed.ts) ya sabe
 * parar ante eso.
 */

const getFeedSessionBatch = vi.fn()

vi.mock('@/modules/feed/application/getFeedSessionBatch', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/feed/application/getFeedSessionBatch')
  >('@/modules/feed/application/getFeedSessionBatch')
  return {
    ...actual,
    getFeedSessionBatch: (...args: unknown[]) => getFeedSessionBatch(...args),
  }
})

function requestWithCookie(visitorId?: string): NextRequest {
  return new NextRequest('http://localhost/api/feed/session-1', {
    headers: visitorId ? { cookie: `greener_visitor=${visitorId}` } : {},
  })
}

const params = { params: Promise.resolve({ sessionId: 'session-1' }) }

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
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

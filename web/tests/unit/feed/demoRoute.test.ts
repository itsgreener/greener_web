import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * /api/feed/demo NUNCA debe responder en producción (PROGRESO §4.8): sirve
 * un dataset de prueba sin relación con el contenido real, y hasta el 29
 * de septiembre era una ruta pública sin ninguna guarda.
 */

vi.mock('@/modules/feed/application/getDemoFeedBatch', () => ({
  getDemoFeedBatch: vi.fn(),
}))

function request(query = 'seed=abc') {
  return new NextRequest(`http://localhost:3000/api/feed/demo?${query}`)
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.clearAllMocks()
})

describe('GET /api/feed/demo — bloqueada en producción', () => {
  it('en producción responde 404 sin llegar a leer el dataset de demo', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { getDemoFeedBatch } =
      await import('@/modules/feed/application/getDemoFeedBatch')
    const { GET } = await import('@/app/api/feed/demo/route')

    const response = await GET(request())

    expect(response.status).toBe(404)
    expect(getDemoFeedBatch).not.toHaveBeenCalled()
  })

  it('fuera de producción sigue funcionando (sigue siendo útil en desarrollo)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { getDemoFeedBatch } =
      await import('@/modules/feed/application/getDemoFeedBatch')
    vi.mocked(getDemoFeedBatch).mockResolvedValue({
      items: [],
      nextOffset: 0,
      hasMore: false,
    })
    const { GET } = await import('@/app/api/feed/demo/route')

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(getDemoFeedBatch).toHaveBeenCalledWith('abc', 0, 40)
  })

  it('sin NODE_ENV=production, un seed ausente sigue devolviendo el 400 de siempre (la guarda no lo enmascara)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { GET } = await import('@/app/api/feed/demo/route')

    const response = await GET(request(''))

    expect(response.status).toBe(400)
  })
})

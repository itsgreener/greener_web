import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Plan de pendientes, B2: GET /api/health. 200 {status:'ok'} si Supabase
 * responde, 503 {status:'error'} si no, sin detalles y sin caché.
 */

const query = vi.hoisted(() => ({
  result: { data: [{ batch_size: 40 }], error: null } as {
    data: unknown
    error: unknown
  },
  throws: false,
  abortSignal: vi.fn(),
}))

vi.mock('@/lib/supabase/publicReadClient', () => ({
  createPublicReadClient: () => ({
    from: () => ({
      select: () => ({
        limit: () => ({
          abortSignal: (signal: AbortSignal) => {
            query.abortSignal(signal)
            if (query.throws) return Promise.reject(new Error('socket hang up'))

            return Promise.resolve(query.result)
          },
        }),
      }),
    }),
  }),
}))

import { GET } from '@/app/api/health/route'
import { HEALTH_CHECK_TIMEOUT_MS } from '@/modules/health/infrastructure/databaseHealth'

beforeEach(() => {
  query.result = { data: [{ batch_size: 40 }], error: null }
  query.throws = false
  query.abortSignal.mockClear()
})

describe('GET /api/health', () => {
  it('200 {status:"ok"} cuando la base responde', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('nunca se cachea', async () => {
    const ok = await GET()
    query.throws = true
    const failing = await GET()

    expect(ok.headers.get('Cache-Control')).toBe('no-store')
    expect(failing.headers.get('Cache-Control')).toBe('no-store')
  })

  it('503 {status:"error"} cuando Supabase devuelve un error, sin filtrar el detalle', async () => {
    query.result = {
      data: null,
      error: {
        message: 'relation "feed_config" does not exist',
        code: '42P01',
      },
    }

    const response = await GET()
    const text = await response.text()

    expect(response.status).toBe(503)
    expect(JSON.parse(text)).toEqual({ status: 'error' })
    expect(text).not.toMatch(/feed_config|42P01|relation/)
  })

  it('503 si la lectura lanza (red caída, timeout), sin detalles', async () => {
    query.throws = true

    const response = await GET()
    const text = await response.text()

    expect(response.status).toBe(503)
    expect(JSON.parse(text)).toEqual({ status: 'error' })
    expect(text).not.toMatch(/socket/)
  })

  it('503 si la tabla no tiene la fila de configuración (esquema sin aplicar)', async () => {
    query.result = { data: [], error: null }

    expect((await GET()).status).toBe(503)
  })

  it('la lectura lleva un tiempo máximo para que el monitor no se quede colgado', async () => {
    await GET()

    expect(query.abortSignal).toHaveBeenCalledTimes(1)
    expect(HEALTH_CHECK_TIMEOUT_MS).toBeLessThanOrEqual(5_000)
  })
})

describe('/api/health y el proxy', () => {
  it('no es una trampa de bots ni una ruta del ABM: el monitor no necesita sesión', async () => {
    const { classifyBotTrap } = await import('@/lib/botTraps')

    expect(classifyBotTrap('/api/health')).toBeNull()
    expect('/api/health'.startsWith('/api/admin')).toBe(false)
  })
})

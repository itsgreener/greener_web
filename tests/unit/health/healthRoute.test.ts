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

import { NextRequest } from 'next/server'

import { GET } from '@/app/api/health/route'
import { HEALTH_RATE_LIMIT } from '@/modules/health/domain/healthLimits'
import { HEALTH_CHECK_TIMEOUT_MS } from '@/modules/health/infrastructure/databaseHealth'

let nextIp = 0

/** Cada llamada con su propia IP, para que el límite de una prueba no afecte a otra. */
function call(ip: string | null = `203.0.113.${++nextIp}`) {
  return GET(
    new NextRequest('https://itsgreener.com/api/health', {
      headers: ip ? { 'x-forwarded-for': ip } : {},
    }),
  )
}

beforeEach(() => {
  query.result = { data: [{ batch_size: 40 }], error: null }
  query.throws = false
  query.abortSignal.mockClear()
})

describe('GET /api/health', () => {
  it('200 {status:"ok"} cuando la base responde', async () => {
    const response = await call()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('nunca se cachea', async () => {
    const ok = await call()
    query.throws = true
    const failing = await call()

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

    const response = await call()
    const text = await response.text()

    expect(response.status).toBe(503)
    expect(JSON.parse(text)).toEqual({ status: 'error' })
    expect(text).not.toMatch(/feed_config|42P01|relation/)
  })

  it('503 si la lectura lanza (red caída, timeout), sin detalles', async () => {
    query.throws = true

    const response = await call()
    const text = await response.text()

    expect(response.status).toBe(503)
    expect(JSON.parse(text)).toEqual({ status: 'error' })
    expect(text).not.toMatch(/socket/)
  })

  it('503 si la tabla no tiene la fila de configuración (esquema sin aplicar)', async () => {
    query.result = { data: [], error: null }

    expect((await call()).status).toBe(503)
  })

  it('la lectura lleva un tiempo máximo para que el monitor no se quede colgado', async () => {
    await call()

    expect(query.abortSignal).toHaveBeenCalledTimes(1)
    expect(HEALTH_CHECK_TIMEOUT_MS).toBeLessThanOrEqual(5_000)
  })
})

describe('GET /api/health · límite por IP', () => {
  it('la llamada que supera el tope da 429 sin tocar la base', async () => {
    const ip = '198.51.100.7'

    for (let i = 0; i < HEALTH_RATE_LIMIT.max; i++) {
      expect((await call(ip)).status).toBe(200)
    }

    query.abortSignal.mockClear()
    const blocked = await call(ip)

    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ status: 'rate_limited' })
    expect(blocked.headers.get('Retry-After')).toBe('60')
    expect(blocked.headers.get('Cache-Control')).toBe('no-store')
    expect(query.abortSignal).not.toHaveBeenCalled()
  })

  it('el tope es por IP: otra IP sigue pasando', async () => {
    const ip = '198.51.100.8'

    for (let i = 0; i <= HEALTH_RATE_LIMIT.max; i++) await call(ip)

    expect((await call(ip)).status).toBe(429)
    expect((await call('198.51.100.9')).status).toBe(200)
  })

  it('sin IP legible no se limita (todos compartirían llave y el monitor recibiría 429 por culpa de otros)', async () => {
    for (let i = 0; i < HEALTH_RATE_LIMIT.max + 10; i++) {
      expect((await call(null)).status).toBe(200)
    }
  })

  it('el tope deja margen a un monitor (una o dos sondas por minuto)', () => {
    expect(HEALTH_RATE_LIMIT.max).toBeGreaterThanOrEqual(20)
    expect(HEALTH_RATE_LIMIT.windowMs).toBe(60_000)
  })
})

describe('/api/health y el proxy', () => {
  it('no es una trampa de bots ni una ruta del ABM: el monitor no necesita sesión', async () => {
    const { classifyBotTrap } = await import('@/lib/botTraps')

    expect(classifyBotTrap('/api/health')).toBeNull()
    expect('/api/health'.startsWith('/api/admin')).toBe(false)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Límite compartido (SEC-PUB-A1/A2): contador en Upstash por REST, con
 * respaldo en memoria si el almacén no está o falla. `fetch` se sustituye;
 * el limitador, el cliente REST y el entorno son los reales.
 */

const STORE_URL = 'https://eu-example.upstash.io'

type Call = { url: string; body: unknown; headers: Record<string, string> }

let calls: Call[]
let fetchMock: ReturnType<typeof vi.fn>

function replyWith(results: unknown[]) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    calls.push({
      url,
      body: JSON.parse(String(init.body)),
      headers: init.headers as Record<string, string>,
    })

    return new Response(JSON.stringify(results.map((result) => ({ result }))), {
      status: 200,
    })
  })
}

function configureStore() {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', STORE_URL)
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token-de-prueba')
}

beforeEach(() => {
  vi.resetModules()
  calls = []
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  vi.stubEnv('KV_REST_API_URL', '')
  vi.stubEnv('KV_REST_API_TOKEN', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createSharedRateLimiter — sin almacén configurado', () => {
  it('cuenta en memoria y no llama a la red', async () => {
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')
    const limiter = createSharedRateLimiter({
      name: 'prueba',
      max: 2,
      windowMs: 60_000,
    })

    expect(await limiter.check('a')).toBe(true)
    expect(await limiter.check('a')).toBe(true)
    expect(await limiter.check('a')).toBe(false)
    expect(await limiter.check('b')).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('createSharedRateLimiter — con almacén', () => {
  it('incrementa y fija la caducidad en una sola transacción, con la clave hasheada', async () => {
    configureStore()
    replyWith([1, 1])
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')
    const limiter = createSharedRateLimiter({
      name: 'prueba',
      max: 3,
      windowMs: 90_000,
    })

    expect(await limiter.check('203.0.113.7')).toBe(true)

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${STORE_URL}/multi-exec`)
    expect(calls[0].headers.Authorization).toBe('Bearer token-de-prueba')

    const [incr, expire] = calls[0].body as [string, string, ...unknown[]][]
    expect(incr[0]).toBe('INCR')
    expect(expire.slice(0, 1)).toEqual(['PEXPIRE'])
    expect(expire[1]).toBe(incr[1])
    expect(expire.slice(2)).toEqual([90_000, 'NX'])

    // Ni la IP ni el nombre en claro llegan al servicio de terceros.
    expect(String(incr[1])).toMatch(/^rl:prueba:[0-9a-f]{64}$/)
    expect(JSON.stringify(calls[0].body)).not.toContain('203.0.113.7')
  })

  it('permite hasta el máximo y bloquea el siguiente según el contador compartido', async () => {
    configureStore()
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')
    const limiter = createSharedRateLimiter({
      name: 'prueba',
      max: 3,
      windowMs: 60_000,
    })

    replyWith([3, 0])
    expect(await limiter.check('k')).toBe(true)

    replyWith([4, 0])
    expect(await limiter.check('k')).toBe(false)
  })

  it('la misma clave en límites con distinto nombre no comparte contador', async () => {
    configureStore()
    replyWith([1, 1])
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')

    await createSharedRateLimiter({
      name: 'uno',
      max: 1,
      windowMs: 1000,
    }).check('k')
    await createSharedRateLimiter({
      name: 'dos',
      max: 1,
      windowMs: 1000,
    }).check('k')

    const keys = calls.map((call) => (call.body as string[][])[0][1])

    expect(keys[0]).not.toBe(keys[1])
  })

  it('si el almacén responde con error, cae al límite en memoria (y lo registra)', async () => {
    configureStore()
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')
    const limiter = createSharedRateLimiter({
      name: 'prueba',
      max: 1,
      windowMs: 60_000,
    })

    expect(await limiter.check('k')).toBe(true)
    expect(await limiter.check('k')).toBe(false)
    expect(console.error).toHaveBeenCalled()
  })

  it('si la red falla o tarda demasiado, cae al límite en memoria', async () => {
    configureStore()
    fetchMock.mockRejectedValue(new Error('timeout'))
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')
    const limiter = createSharedRateLimiter({
      name: 'prueba',
      max: 1,
      windowMs: 60_000,
    })

    expect(await limiter.check('k')).toBe(true)
    expect(await limiter.check('k')).toBe(false)
  })

  it('un error dentro de la respuesta del almacén también cuenta como fallo', async () => {
    configureStore()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ error: 'NOPERM' }, { result: 0 }]), {
        status: 200,
      }),
    )
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')
    const limiter = createSharedRateLimiter({
      name: 'prueba',
      max: 1,
      windowMs: 60_000,
    })

    expect(await limiter.check('k')).toBe(true)
    expect(await limiter.check('k')).toBe(false)
  })

  it('un contador que no es un número se trata como fallo, no como permitido', async () => {
    configureStore()
    replyWith(['raro', 0])
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')
    const limiter = createSharedRateLimiter({
      name: 'prueba',
      max: 1,
      windowMs: 60_000,
    })

    expect(await limiter.check('k')).toBe(true)
    expect(await limiter.check('k')).toBe(false)
  })

  it('acepta los nombres de variable de la integración de Vercel (KV_REST_API_*)', async () => {
    vi.stubEnv('KV_REST_API_URL', `${STORE_URL}/`)
    vi.stubEnv('KV_REST_API_TOKEN', 'token-kv')
    replyWith([1, 1])
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')

    await createSharedRateLimiter({
      name: 'prueba',
      max: 1,
      windowMs: 1000,
    }).check('k')

    expect(calls[0].url).toBe(`${STORE_URL}/multi-exec`)
    expect(calls[0].headers.Authorization).toBe('Bearer token-kv')
  })

  it('la configuración rota (URL sin token) se ignora sin repetir el error en cada comprobación', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', STORE_URL)
    const { createSharedRateLimiter } =
      await import('@/lib/rateLimit/sharedRateLimiter')
    const limiter = createSharedRateLimiter({
      name: 'prueba',
      max: 1,
      windowMs: 60_000,
    })

    expect(await limiter.check('k')).toBe(true)
    expect(await limiter.check('k')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})

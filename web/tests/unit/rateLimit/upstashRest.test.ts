import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://eu-example.upstash.io///')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token-de-prueba')
  vi.stubEnv('KV_REST_API_URL', '')
  vi.stubEnv('KV_REST_API_TOKEN', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('runRedis', () => {
  it('manda los comandos en el modo pedido, con tiempo máximo y sin caché', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ result: 'OK' }]), { status: 200 }),
    )
    const { runRedis, UPSTASH_TIMEOUT_MS } =
      await import('@/lib/rateLimit/upstashRest')

    const replies = await runRedis([['SET', 'k', 'v', 'EX', 60]], 'pipeline')

    expect(replies).toEqual(['OK'])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://eu-example.upstash.io/pipeline')
    expect(init.method).toBe('POST')
    expect(init.cache).toBe('no-store')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(init.body)).toEqual([['SET', 'k', 'v', 'EX', 60]])
    expect(UPSTASH_TIMEOUT_MS).toBeLessThanOrEqual(1000)
  })

  it('falla si el número de respuestas no coincide con el de comandos', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ result: 1 }]), { status: 200 }),
    )
    const { runRedis } = await import('@/lib/rateLimit/upstashRest')

    await expect(
      runRedis([
        ['GET', 'a'],
        ['GET', 'b'],
      ]),
    ).rejects.toThrow(/inesperada/)
  })

  it('falla sin almacén configurado', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const { runRedis } = await import('@/lib/rateLimit/upstashRest')

    await expect(runRedis([['GET', 'a']])).rejects.toThrow(/No hay almacén/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

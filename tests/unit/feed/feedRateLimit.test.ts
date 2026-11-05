import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * feedRateLimit.ts es estado de módulo (limitadores y el mapa de
 * "última sesión" son singletons creados una vez al importar) —
 * vi.resetModules() + import dinámico en cada test para partir de
 * estado limpio, mismo patrón que env.ts/analytics.ts en este proyecto.
 */

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-29T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('canCreateSession / canFetchBatch', () => {
  it('permite hasta 12 creaciones de sesión por minuto y visitante, y bloquea la 13ª', async () => {
    const { canCreateSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 12; i++) {
      expect(await canCreateSession('visitor-1')).toBe(true)
    }
    expect(await canCreateSession('visitor-1')).toBe(false)
  })

  it('permite hasta 50 lotes por minuto y visitante, y bloquea el 51º', async () => {
    const { canFetchBatch } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 50; i++) {
      expect(await canFetchBatch('visitor-1')).toBe(true)
    }
    expect(await canFetchBatch('visitor-1')).toBe(false)
  })

  it('los dos límites son independientes: agotar uno no afecta al otro', async () => {
    const { canCreateSession, canFetchBatch } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 12; i++) await canCreateSession('visitor-1')
    expect(await canCreateSession('visitor-1')).toBe(false)
    expect(await canFetchBatch('visitor-1')).toBe(true)
  })

  it('cada visitante tiene su propio cupo', async () => {
    const { canCreateSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 12; i++) await canCreateSession('visitor-1')
    expect(await canCreateSession('visitor-1')).toBe(false)
    expect(await canCreateSession('visitor-2')).toBe(true)
  })
})

describe('rememberSession / getLastSession', () => {
  it('sin ninguna sesión recordada, devuelve null', async () => {
    const { getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    expect(await getLastSession('visitor-1', 'home')).toBeNull()
  })

  it('devuelve la última sesión recordada para ese visitante', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'session-a', 'home')
    await rememberSession('visitor-1', 'session-b', 'home')

    expect(await getLastSession('visitor-1', 'home')).toBe('session-b')
  })

  it('no mezcla la sesión recordada de visitantes distintos', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'session-a', 'home')
    await rememberSession('visitor-2', 'session-z', 'home')

    expect(await getLastSession('visitor-1', 'home')).toBe('session-a')
    expect(await getLastSession('visitor-2', 'home')).toBe('session-z')
  })

  it('una sesión recordada hace más de 24h ya no se devuelve', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'session-a', 'home')
    vi.setSystemTime(new Date('2026-09-30T10:00:01Z')) // 24h + 1s después

    expect(await getLastSession('visitor-1', 'home')).toBeNull()
  })
})

describe('rememberSession / getLastSession — por visitante Y scope (5 oct 2026)', () => {
  it('no reutiliza la sesión de un scope al pedir otro: la de home no sirve para tools', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'session-home', 'home')
    await rememberSession('visitor-1', 'session-tools', 'tools')

    expect(await getLastSession('visitor-1', 'home')).toBe('session-home')
    expect(await getLastSession('visitor-1', 'tools')).toBe('session-tools')
    expect(await getLastSession('visitor-1', 'channel')).toBeNull()
  })

  it('cada scope recuerda solo su última sesión', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'a', 'insights')
    await rememberSession('visitor-1', 'b', 'insights')

    expect(await getLastSession('visitor-1', 'insights')).toBe('b')
  })

  it('el mismo scope de visitantes distintos no se mezcla', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'a', 'tools')

    expect(await getLastSession('visitor-2', 'tools')).toBeNull()
  })

  it('una sesión recordada hace más de 24h ya no se devuelve, en ningún scope', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'a', 'tools')

    vi.setSystemTime(new Date('2026-09-30T10:00:01Z'))

    expect(await getLastSession('visitor-1', 'tools')).toBeNull()
  })
})

describe('límite también por IP (SEC-PUB-A2)', () => {
  it('rotar la cookie de visitante no esquiva el límite de creación de sesiones de la IP', async () => {
    const { canCreateSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 60; i++) {
      expect(await canCreateSession(`visitor-${i}`, '203.0.113.7')).toBe(true)
    }

    expect(await canCreateSession('visitor-nuevo', '203.0.113.7')).toBe(false)
    expect(await canCreateSession('visitor-nuevo', '203.0.113.8')).toBe(true)
  })

  it('rotar la cookie de visitante no esquiva el límite de lotes de la IP', async () => {
    const { canFetchBatch } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 300; i++) {
      expect(await canFetchBatch(`visitor-${i}`, '203.0.113.7')).toBe(true)
    }

    expect(await canFetchBatch('visitor-nuevo', '203.0.113.7')).toBe(false)
  })

  it('el cupo por visitante sigue aplicando aunque la IP tenga margen', async () => {
    const { canCreateSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 12; i++) await canCreateSession('visitor-1', '1.1.1.1')

    expect(await canCreateSession('visitor-1', '1.1.1.1')).toBe(false)
  })
})

describe('sesión de repuesto en el almacén compartido', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://eu-example.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token-de-prueba')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('guarda la sesión con caducidad de 24 h bajo una clave hasheada', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ result: 'OK' }]), { status: 200 }),
    )
    const { rememberSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'session-a', 'home')

    const [url, init] = fetchMock.mock.calls[0]
    const [command] = JSON.parse(init.body) as unknown[][]

    expect(url).toBe('https://eu-example.upstash.io/pipeline')
    expect(command[0]).toBe('SET')
    expect(String(command[1])).toMatch(/^rl:feed-last-session:[0-9a-f]{64}$/)
    expect(command.slice(2)).toEqual(['session-a', 'EX', 86_400])
  })

  it('lee la sesión del almacén, aunque esta instancia no la haya creado', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ result: 'session-de-otra-instancia' }]), {
        status: 200,
      }),
    )
    const { getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    expect(await getLastSession('visitor-1', 'home')).toBe(
      'session-de-otra-instancia',
    )
  })

  it('si el almacén falla, usa la memoria de la instancia', async () => {
    fetchMock.mockRejectedValue(new Error('sin red'))
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    await rememberSession('visitor-1', 'session-a', 'home')

    expect(await getLastSession('visitor-1', 'home')).toBe('session-a')
  })
})

describe('tope de la memoria de sesiones (SEC-PUB-A1)', () => {
  it('no crece sin límite con visitantes rotatorios: descarta la más antigua', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 10_001; i++) {
      await rememberSession(`visitor-${i}`, `session-${i}`, 'home')
    }

    expect(await getLastSession('visitor-0', 'home')).toBeNull()
    expect(await getLastSession('visitor-1', 'home')).toBe('session-1')
    expect(await getLastSession('visitor-10000', 'home')).toBe('session-10000')
  })
})

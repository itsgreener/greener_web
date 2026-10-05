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
      expect(canCreateSession('visitor-1')).toBe(true)
    }
    expect(canCreateSession('visitor-1')).toBe(false)
  })

  it('permite hasta 50 lotes por minuto y visitante, y bloquea el 51º', async () => {
    const { canFetchBatch } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 50; i++) {
      expect(canFetchBatch('visitor-1')).toBe(true)
    }
    expect(canFetchBatch('visitor-1')).toBe(false)
  })

  it('los dos límites son independientes: agotar uno no afecta al otro', async () => {
    const { canCreateSession, canFetchBatch } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 12; i++) canCreateSession('visitor-1')
    expect(canCreateSession('visitor-1')).toBe(false)
    expect(canFetchBatch('visitor-1')).toBe(true)
  })

  it('cada visitante tiene su propio cupo', async () => {
    const { canCreateSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    for (let i = 0; i < 12; i++) canCreateSession('visitor-1')
    expect(canCreateSession('visitor-1')).toBe(false)
    expect(canCreateSession('visitor-2')).toBe(true)
  })
})

describe('rememberSession / getLastSession', () => {
  it('sin ninguna sesión recordada, devuelve null', async () => {
    const { getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    expect(getLastSession('visitor-1')).toBeNull()
  })

  it('devuelve la última sesión recordada para ese visitante', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    rememberSession('visitor-1', 'session-a')
    rememberSession('visitor-1', 'session-b')

    expect(getLastSession('visitor-1')).toBe('session-b')
  })

  it('no mezcla la sesión recordada de visitantes distintos', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    rememberSession('visitor-1', 'session-a')
    rememberSession('visitor-2', 'session-z')

    expect(getLastSession('visitor-1')).toBe('session-a')
    expect(getLastSession('visitor-2')).toBe('session-z')
  })

  it('una sesión recordada hace más de 24h ya no se devuelve', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    rememberSession('visitor-1', 'session-a')
    vi.setSystemTime(new Date('2026-09-30T10:00:01Z')) // 24h + 1s después

    expect(getLastSession('visitor-1')).toBeNull()
  })
})

describe('rememberSession / getLastSession — por visitante Y scope (5 oct 2026)', () => {
  it('no reutiliza la sesión de un scope al pedir otro: la de home no sirve para tools', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    rememberSession('visitor-1', 'session-home', 'home')
    rememberSession('visitor-1', 'session-tools', 'tools')

    expect(getLastSession('visitor-1', 'home')).toBe('session-home')
    expect(getLastSession('visitor-1', 'tools')).toBe('session-tools')
    expect(getLastSession('visitor-1', 'channel')).toBeNull()
  })

  it('sin scope usa home, compatible con las llamadas antiguas de dos argumentos', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    rememberSession('visitor-1', 'session-1')

    expect(getLastSession('visitor-1')).toBe('session-1')
    expect(getLastSession('visitor-1', 'home')).toBe('session-1')
    expect(getLastSession('visitor-1', 'work')).toBeNull()
  })

  it('cada scope recuerda solo su última sesión', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    rememberSession('visitor-1', 'a', 'insights')
    rememberSession('visitor-1', 'b', 'insights')

    expect(getLastSession('visitor-1', 'insights')).toBe('b')
  })

  it('el mismo scope de visitantes distintos no se mezcla', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    rememberSession('visitor-1', 'a', 'tools')

    expect(getLastSession('visitor-2', 'tools')).toBeNull()
  })

  it('una sesión recordada hace más de 24h ya no se devuelve, en ningún scope', async () => {
    const { rememberSession, getLastSession } =
      await import('@/modules/feed/infrastructure/feedRateLimit')

    rememberSession('visitor-1', 'a', 'tools')

    vi.setSystemTime(new Date('2026-09-30T10:00:01Z'))

    expect(getLastSession('visitor-1', 'tools')).toBeNull()
  })
})

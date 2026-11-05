import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchFeedBatch,
  nextHasMore,
  openFeedSession,
} from '@/components/masonry/feedApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ sessionId: 's1' }),
    }),
  )
}

describe('feedApi — errores', () => {
  it('abrir la sesión con un 500 lanza un mensaje en español con el estado', async () => {
    stubFetch(500)

    await expect(openFeedSession('home')).rejects.toThrow(
      'No se pudo abrir la sesión del feed: 500',
    )
  })

  it('pedir un lote con un 429 lanza un mensaje en español con el estado', async () => {
    stubFetch(429)

    await expect(fetchFeedBatch('s1', null)).rejects.toThrow(
      'No se pudo cargar el lote del feed: 429',
    )
  })

  it('con respuesta correcta devuelve el id de la sesión', async () => {
    stubFetch(200)

    await expect(openFeedSession('work')).resolves.toBe('s1')
  })
})

describe('nextHasMore', () => {
  it('con pines en el lote, manda lo que diga el servidor', () => {
    expect(nextHasMore({ items: [{}], hasMore: true })).toBe(true)
    expect(nextHasMore({ items: [{}], hasMore: false })).toBe(false)
  })

  it('una ronda vacía es definitiva aunque el servidor diga que hay más', () => {
    expect(nextHasMore({ items: [], hasMore: true })).toBe(false)
  })
})

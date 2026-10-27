// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'

/**
 * PUB-B6 (auditoría TSX), lote 2: el primer lote del panel de recomendaciones
 * ya no se lanza con `queueMicrotask` y su «cargando» se deriva.
 */

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function oneItem(n: number) {
  return {
    pinId: `pin-${n}`,
    contentId: `content-${n}`,
    kind: 'case',
    destination: `/work/c-${n}`,
    ratio: '1:1',
    label: null,
    cta: 'Watch',
    alt: 'alt',
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
  }
}

/** La sesión responde al momento y el lote espera a `release`. */
function stubFeed(batch: () => Response) {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const calls: string[] = []

  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return respond({ sessionId: 's1' })
    calls.push(url)
    await gate
    return batch()
  }) as unknown as typeof fetch

  return { release: () => release(), calls }
}

beforeEach(() => {
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver

  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver
})

describe('useRecommendationMasonry — primera carga', () => {
  it('con la sesión abierta y el primer lote en vuelo está cargando; al llegar, deja de estarlo', async () => {
    const feed = stubFeed(() =>
      respond({ items: [oneItem(1)], cursor: 'c1', round: 0, hasMore: true }),
    )

    const { result } = renderHook(() => useRecommendationMasonry('c1', '1:1'))

    expect(result.current.isLoading).toBe(false)

    await waitFor(() => expect(result.current.isLoading).toBe(true))

    await act(async () => feed.release())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.itemCount).toBe(1)
    expect(feed.calls).toHaveLength(1)
  })

  it('un lote limitado por peticiones no deja el panel «cargando» para siempre', async () => {
    const feed = stubFeed(() =>
      respond({
        items: [],
        cursor: 'c0',
        round: 0,
        hasMore: true,
        rateLimited: true,
      }),
    )

    const { result } = renderHook(() => useRecommendationMasonry('c1', '1:1'))

    await waitFor(() => expect(result.current.isLoading).toBe(true))
    await act(async () => feed.release())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe(false)
  })

  it('si el primer lote falla, hay error y no «cargando»', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const feed = stubFeed(() => respond({ error: 'x' }, 500))

    const { result } = renderHook(() => useRecommendationMasonry('c1', '1:1'))

    await waitFor(() => expect(result.current.isLoading).toBe(true))
    await act(async () => feed.release())

    await waitFor(() => expect(result.current.error).toBe(true))
    expect(result.current.isLoading).toBe(false)
  })
})

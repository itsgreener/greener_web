// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

vi.mock('@/components/masonry/useMasonryPositions', () => ({
  useMasonryPositions: () => ({
    containerRef: { current: null },
    positioned: [],
    totalHeight: 0,
  }),
}))

vi.mock('@/components/masonry/useSentinel', () => ({
  useSentinel: () => () => undefined,
}))

import { FeedProvider } from '@/components/masonry/FeedProvider'
import { useFeed } from '@/components/masonry/Feed/useFeed'

/**
 * PUB-B6 (auditoría TSX), lote 2: el primer lote del feed ya no se lanza con
 * `queueMicrotask` y su «cargando» se deriva en vez de ser estado. Estos tests
 * fijan lo que ve el visitante en cada punto de la primera carga.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <FeedProvider>{children}</FeedProvider>
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

function oneItem() {
  return {
    kind: 'case',
    pinId: 'pin-1',
    contentId: 'content-1',
    destination: '/work/c-1',
    ratio: '1:1',
    label: null,
    cta: 'Watch',
    alt: 'alt',
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
  }
}

/** fetch del feed: la sesión responde al momento y el lote espera a `release`. */
function stubFeed(batch: () => Response | Promise<Response>) {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/feed/sessions' && init?.method === 'POST') {
        return json({ sessionId: 'session-1' })
      }
      if (url.startsWith('/api/feed/session-1')) {
        await gate
        return batch()
      }
      throw new Error(`Fetch inesperado: ${url}`)
    }),
  )

  return { release: () => release() }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useFeed — primera carga', () => {
  it('antes de que haya sesión no anuncia «cargando»', () => {
    stubFeed(() => json({}))

    const { result } = renderHook(() => useFeed('home'), { wrapper })

    expect(result.current.isLoading).toBe(false)
  })

  it('con la sesión abierta y el primer lote en vuelo, está cargando; al llegar, deja de estarlo', async () => {
    const feed = stubFeed(() =>
      json({
        items: [oneItem()],
        cursor: 'c1',
        round: 0,
        batch: 0,
        hasMore: true,
      }),
    )

    const { result } = renderHook(() => useFeed('home'), { wrapper })
    await flush()

    expect(result.current.isLoading).toBe(true)
    expect(result.current.itemCount).toBe(0)

    feed.release()
    await flush()

    expect(result.current.isLoading).toBe(false)
    expect(result.current.itemCount).toBe(1)
    expect(result.current.error).toBe(false)
  })

  it('pide el primer lote una sola vez, aunque el efecto se repita', async () => {
    const feed = stubFeed(() =>
      json({
        items: [oneItem()],
        cursor: 'c1',
        round: 0,
        batch: 0,
        hasMore: true,
      }),
    )

    renderHook(() => useFeed('home'), { wrapper })
    await flush()
    feed.release()
    await flush()

    const batchCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) =>
        String(url).startsWith('/api/feed/session-1'),
      )

    expect(batchCalls).toHaveLength(1)
  })

  it('un lote vacío por límite de peticiones no anuncia «cargando» durante la espera', async () => {
    const feed = stubFeed(() =>
      json({
        items: [],
        cursor: 'c0',
        round: 0,
        batch: 0,
        hasMore: true,
        rateLimited: true,
      }),
    )

    const { result } = renderHook(() => useFeed('home'), { wrapper })
    await flush()
    expect(result.current.isLoading).toBe(true)

    feed.release()
    await flush()

    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.itemCount).toBe(0)
  })

  it('un primer lote vacío de verdad deja el feed sin más catálogo y sin «cargando»', async () => {
    const feed = stubFeed(() =>
      json({ items: [], cursor: null, round: 0, batch: 0, hasMore: true }),
    )

    const { result } = renderHook(() => useFeed('home'), { wrapper })
    await flush()
    feed.release()
    await flush()

    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasMore).toBe(false)
  })

  it('si el primer lote falla, hay error y no «cargando»', async () => {
    const feed = stubFeed(() => json({ error: 'x' }, 500))

    const { result } = renderHook(() => useFeed('home'), { wrapper })
    await flush()
    feed.release()
    await flush()

    expect(result.current.error).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })
})

// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  recheckKeys: [] as Array<number | undefined>,
}))

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

// jsdom no trae IntersectionObserver: se sustituye el hook y se anota la
// clave de revisión, que es lo que recrea el observer real.
vi.mock('@/components/masonry/useSentinel', () => ({
  useSentinel: (_onVisible: () => void, recheckKey?: number) => {
    mocks.recheckKeys.push(recheckKey)
    return () => undefined
  },
}))

import { FeedProvider } from '@/components/masonry/FeedProvider'
import { RATE_LIMIT_RETRY_MS, useFeed } from '@/components/masonry/Feed/useFeed'

function wrapper({ children }: { children: ReactNode }) {
  return <FeedProvider>{children}</FeedProvider>
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Deja correr las promesas pendientes (sesión, primer lote) sin avanzar el reloj. */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

const lastRecheckKey = () => mocks.recheckKeys[mocks.recheckKeys.length - 1]

describe('useFeed: lote vacío por límite de peticiones', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mocks.recheckKeys.length = 0
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function stubFeed(batch: Record<string, unknown>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)

        if (url === '/api/feed/sessions' && init?.method === 'POST') {
          return json({ sessionId: 'session-1' })
        }
        if (url.startsWith('/api/feed/session-1')) {
          return json(batch)
        }
        throw new Error(`Fetch inesperado: ${url}`)
      }),
    )
  }

  it('vuelve a revisar el sentinel tras la espera, para no quedarse parado en el final', async () => {
    stubFeed({
      items: [],
      cursor: 'cursor-0',
      round: 0,
      batch: 0,
      hasMore: true,
      rateLimited: true,
    })

    const { result } = renderHook(() => useFeed('home'), { wrapper })
    await flush()

    // El lote vacío por límite no cambia el estado: sigue habiendo más feed.
    expect(result.current.itemCount).toBe(0)
    expect(result.current.hasMore).toBe(true)
    expect(lastRecheckKey()).toBe(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_MS - 1)
    })
    expect(lastRecheckKey()).toBe(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(lastRecheckKey()).toBe(1)
  })

  it('un lote normal no programa ningún reintento', async () => {
    stubFeed({
      items: [
        {
          pinId: 'pin-1',
          contentId: 'content-1',
          kind: 'case',
          destination: '/work/case-1',
          ratio: '1:1',
          label: null,
          cta: 'Watch',
          alt: 'Pin',
          autoplayMode: null,
          media: [{ kind: 'image', cloudinaryPublicId: 'test/image' }],
        },
      ],
      cursor: 'cursor-1',
      round: 0,
      batch: 0,
      hasMore: true,
    })

    const { result } = renderHook(() => useFeed('home'), { wrapper })
    await flush()
    expect(result.current.itemCount).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_MS * 3)
    })
    expect(lastRecheckKey()).toBe(0)
  })

  it('al desmontar se cancela el reintento pendiente', async () => {
    stubFeed({
      items: [],
      cursor: 'cursor-0',
      round: 0,
      batch: 0,
      hasMore: true,
      rateLimited: true,
    })

    const { unmount } = renderHook(() => useFeed('home'), { wrapper })
    await flush()
    unmount()

    const callsBefore = mocks.recheckKeys.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_MS * 2)
    })

    expect(mocks.recheckKeys.length).toBe(callsBefore)
  })
})

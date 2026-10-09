// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'

/**
 * Auditoría 8 oct, P0-4: `loadMore` está memorizado y leía un `cursor` de
 * estado congelado en `null`, así que el panel de recomendaciones pedía
 * siempre la ronda 0. Ahora el cursor vive en un ref.
 */

let ioCallback: IntersectionObserverCallback | null = null
let urls: string[] = []

function respond(body: unknown): Response {
  return new Response(JSON.stringify(body))
}

function oneItem(round: number) {
  return {
    pinId: `pin-${round}`,
    contentId: `content-${round}`,
    kind: 'case',
    destination: `/work/c-${round}`,
    ratio: '1:1',
    label: null,
    cta: 'Watch',
    alt: 'alt',
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
  }
}

function triggerSentinel() {
  ioCallback?.(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  )
}

beforeEach(() => {
  ioCallback = null
  urls = []

  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver

  global.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) {
      ioCallback = callback
    }
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver

  document.body.innerHTML =
    '<div id="greener-recommendations-sentinel-c1"></div>'
})

describe('useRecommendationMasonry — paginación', () => {
  it('la segunda petición lleva el cursor que devolvió la primera', async () => {
    let round = 0

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return respond({ sessionId: 's1' })
      urls.push(url)
      round += 1
      return respond({
        items: [oneItem(round)],
        cursor: `cursor-${round}`,
        round: round - 1,
        hasMore: true,
      })
    }) as unknown as typeof fetch

    renderHook(() => useRecommendationMasonry('c1', '1:1', { scope: 'tools' }))

    await waitFor(() => expect(urls).toHaveLength(1))

    await act(async () => triggerSentinel())
    await waitFor(() => expect(urls).toHaveLength(2))

    await act(async () => triggerSentinel())
    await waitFor(() => expect(urls).toHaveLength(3))

    expect(urls[0]).toBe('/api/feed/s1')
    expect(urls[1]).toBe('/api/feed/s1?cursor=cursor-1')
    expect(urls[2]).toBe('/api/feed/s1?cursor=cursor-2')
  })

  it('un lote limitado por peticiones no avanza el cursor ni corta el panel', async () => {
    let call = 0

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return respond({ sessionId: 's1' })
      urls.push(url)
      call += 1
      if (call === 1) {
        return respond({
          items: [oneItem(1)],
          cursor: 'cursor-1',
          round: 0,
          hasMore: true,
        })
      }
      if (call === 2) {
        return respond({
          items: [],
          cursor: 'cursor-1',
          round: 0,
          hasMore: true,
          rateLimited: true,
        })
      }
      return respond({
        items: [oneItem(2)],
        cursor: 'cursor-2',
        round: 1,
        hasMore: true,
      })
    }) as unknown as typeof fetch

    const { result } = renderHook(() =>
      useRecommendationMasonry('c1', '1:1', { scope: 'tools' }),
    )

    await waitFor(() => expect(urls).toHaveLength(1))
    await act(async () => triggerSentinel())
    await waitFor(() => expect(urls).toHaveLength(2))

    expect(result.current.hasMore).toBe(true)

    await act(async () => triggerSentinel())
    await waitFor(() => expect(urls).toHaveLength(3))

    expect(urls[2]).toBe('/api/feed/s1?cursor=cursor-1')
  })

  it('un lote vacío de verdad deja de pedir más', async () => {
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return respond({ sessionId: 's1' })
      urls.push(url)
      return respond({ items: [], cursor: 'cursor-1', round: 0, hasMore: true })
    }) as unknown as typeof fetch

    const { result } = renderHook(() =>
      useRecommendationMasonry('c1', '1:1', { scope: 'tools' }),
    )

    await waitFor(() => expect(result.current.hasMore).toBe(false))

    await act(async () => triggerSentinel())

    expect(urls).toHaveLength(1)
  })
})

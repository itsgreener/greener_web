// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { HomeFeed } from '@/components/masonry/HomeFeed'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'

const SESSION_ID = 'session-abc'

function fakeBatch(
  count: number,
  cursor: string,
  hasMore: boolean,
): FeedBatchResult {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      pinId: `pin-${i}`,
      contentId: `case-${i}`,
      kind: 'case',
      destination: `/work/case-${i}`,
      ratio: '1:1',
      label: `Pin ${i}`,
      cta: 'Watch',
      alt: `Alt del pin ${i}`,
      media: [{ kind: 'image' as const, cloudinaryPublicId: 'sample' }],
    })),
    cursor,
    hasMore,
  }
}

describe('HomeFeed — prueba de humo', () => {
  beforeEach(() => {
    // ResizeObserver e IntersectionObserver no existen en jsdom. El stub
    // de ResizeObserver invoca el callback en observe() con un ancho fijo,
    // simulando lo que haría el navegador real — si no, containerWidth se
    // queda en 0 y el layout nunca llega a calcularse.
    global.ResizeObserver = class {
      callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }
      observe(target: Element) {
        this.callback(
          [{ contentRect: { width: 1200 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      disconnect() {}
      unobserve() {}
    }
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    }

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/feed/sessions' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ sessionId: SESSION_ID }),
        } as Response
      }
      if (url.startsWith(`/api/feed/${SESSION_ID}`)) {
        return {
          ok: true,
          json: async () => fakeBatch(12, 'cursor-1', true),
        } as Response
      }
      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('abre una sesión real y pinta el primer lote', async () => {
    render(<HomeFeed />)

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(12)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feed/sessions',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(global.fetch).toHaveBeenCalledWith(`/api/feed/${SESSION_ID}`)
  })

  it('si abrir la sesión falla, muestra un mensaje en vez de romper', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
    })) as unknown as typeof fetch

    render(<HomeFeed />)

    await waitFor(() => {
      expect(
        screen.getByText('No se ha podido cargar el feed. Recarga la página.'),
      ).toBeInTheDocument()
    })
  })
})

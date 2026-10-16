// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/app/_actions/newsletterActions', () => ({
  subscribeNewsletterAction: vi.fn(),
}))
vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { Feed } from '@/components/masonry/Feed'
import { useMasonryPositions } from '@/components/masonry/useMasonryPositions'
import { FeedProvider } from '@/components/masonry/FeedProvider'
import type { FeedBatchResult } from '@/modules/feed/domain/feedReadModels'

/**
 * El feed pinta las apariciones de newsletter con su tarjeta, de una columna
 * y proporción 4:5, sin rótulo debajo, entre los pines.
 */

const BATCH: FeedBatchResult = {
  items: [
    {
      pinId: 'p1',
      contentId: 'c1',
      kind: 'case',
      destination: '/work/c1',
      ratio: '1:1',
      label: null,
      cta: 'Watch',
      alt: 'Pin 1',
      autoplayMode: null,
      media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
    },
    {
      kind: 'newsletter',
      pinId: 'newsletter:n1:0',
      contentId: 'n1',
      title: 'Brand news, once a month',
      text: 'Straight to your inbox.',
    },
    {
      pinId: 'p2',
      contentId: 'c2',
      kind: 'other',
      destination: '/variety/una-pagina/app',
      ratio: '1:1',
      label: 'Una página',
      cta: 'Open',
      alt: 'Pin 2',
      autoplayMode: null,
      media: [{ kind: 'image', cloudinaryPublicId: 'sample' }],
    },
  ],
  cursor: 'c',
  round: 0,
  batch: 0,
  hasMore: true,
}

beforeEach(() => {
  window.sessionStorage.clear()
  global.ResizeObserver = class {
    callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }
    observe() {
      this.callback(
        [{ contentRect: { width: 1200 } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      )
    }
    disconnect() {}
    unobserve() {}
  }
  // @ts-expect-error -- stub mínimo suficiente para la prueba
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  }
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/feed/sessions' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ sessionId: 's1' }) } as Response
    }
    return { ok: true, json: async () => BATCH } as Response
  }) as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

describe('Feed con newsletter', () => {
  it('pinta la tarjeta de newsletter entre los pines, sin perder ninguno', async () => {
    render(
      <FeedProvider>
        <Feed scope="home" />
      </FeedProvider>,
    )

    expect(
      await screen.findByRole('region', { name: 'Newsletter' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getAllByRole('link', { name: /Pin|Una página/ }),
      ).toHaveLength(2)
    })
    expect(
      screen.getByRole('heading', { name: 'Brand news, once a month' }),
    ).toBeInTheDocument()
  })

  it('el pin de una página satélite abre /variety/{slug}/app', async () => {
    render(
      <FeedProvider>
        <Feed scope="home" />
      </FeedProvider>,
    )

    const link = await screen.findByRole('link', { name: /Pin 2|Una página/ })
    expect(link).toHaveAttribute('href', '/variety/una-pagina/app')
  })
})

describe('retícula con la tarjeta de newsletter', () => {
  function Probe() {
    const { containerRef, positioned } = useMasonryPositions(BATCH.items, [
      BATCH.items.length,
    ])

    return (
      <div ref={containerRef}>
        {positioned.map((p) => (
          <p key={p.key} data-testid={p.item.pinId}>
            {Math.round(p.width)}x{Math.round(p.height)}
          </p>
        ))}
      </div>
    )
  }

  it('ocupa una columna con proporción 4:5, igual que un pin 4:5', () => {
    render(<Probe />)

    // 1200 px de contenedor, 6 columnas y 12 px de hueco → 190 px de columna.
    expect(screen.getByTestId('newsletter:n1:0')).toHaveTextContent('190x238')
    expect(screen.getByTestId('p1')).toHaveTextContent('190x190')
  })
})

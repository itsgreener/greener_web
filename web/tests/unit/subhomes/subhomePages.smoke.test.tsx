// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FeedProvider } from '@/components/masonry/FeedProvider'
import WorkPage from '@/app/(public)/work/page'
import InsightsPage from '@/app/(public)/insights/page'
import ToolsPage from '@/app/(public)/tools/page'
import ChannelPage from '@/app/(public)/channel/page'

/**
 * Cada subhome es (AuxNav + Feed) con un scope fijo — este test solo
 * comprueba que cada page.tsx pide la sesión con el scope correcto, no
 * repite toda la cobertura de Feed (ya cubierta en
 * tests/unit/masonry/feed.smoke.test.tsx).
 */
describe.each([
  ['/work', WorkPage, 'work'],
  ['/insights', InsightsPage, 'insights'],
  ['/tools', ToolsPage, 'tools'],
  ['/channel', ChannelPage, 'channel'],
] as const)('%s', (_path, Page, scope) => {
  beforeEach(() => {
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
    // @ts-expect-error -- stub mínimo suficiente para el smoke test
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    }

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/feed/sessions' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ sessionId: `session-${scope}` }),
        } as Response
      }
      if (url.startsWith(`/api/feed/session-${scope}`)) {
        return {
          ok: true,
          json: async () => ({ items: [], cursor: 'c1', hasMore: false }),
        } as Response
      }
      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it(`pide la sesión de feed con scope="${scope}"`, async () => {
    render(
      <FeedProvider>
        <Page />
      </FeedProvider>,
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feed/sessions',
        expect.objectContaining({ body: JSON.stringify({ scope }) }),
      )
    })
  })

  it('pinta el AuxNav', () => {
    render(
      <FeedProvider>
        <Page />
      </FeedProvider>,
    )

    expect(screen.getByRole('link', { name: 'All' })).toBeInTheDocument()
  })
})

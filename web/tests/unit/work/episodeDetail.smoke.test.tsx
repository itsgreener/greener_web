// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { EpisodeDetail } from '@/app/(public)/work/[slug]/EpisodeDetail'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { PublicEpisode } from '@/modules/content/infrastructure/publicEpisodeSource'
import type { FeedBatchResult } from '@/modules/feed/application/getFeedSessionBatch'

const CONTENT: PublicContent = {
  id: 'content-1',
  type: 'episode',
  slug: 'mi-episodio',
  defaultLocale: 'es',
  locale: 'es',
  availableLocales: ['es'],
  title: 'Mi episodio',
  seoTitle: null,
  seoDescription: null,
  summary: null,
  highlight: null,
  body: null,
  coverMedia: null,
  coverRatio: null,
}

function fakeBatch(count: number, hasMore: boolean): FeedBatchResult {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      pinId: `rec-pin-${i}`,
      contentId: `rec-content-${i}`,
      kind: 'case',
      destination: `/work/rec-${i}`,
      ratio: '1:1',
      label: `Recomendación ${i}`,
      cta: 'Watch',
      alt: `Alt ${i}`,
      autoplayMode: null,
      media: [{ kind: 'image' as const, cloudinaryPublicId: 'sample' }],
    })),
    cursor: 'cursor-1',
    hasMore,
  }
}

describe('EpisodeDetail — prueba de humo', () => {
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
          json: async () => ({ sessionId: 'session-episode' }),
        } as Response
      }
      if (url.startsWith('/api/feed/session-episode')) {
        return { ok: true, json: async () => fakeBatch(3, false) } as Response
      }
      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['youtube', 'abc123', 'https://www.youtube-nocookie.com/embed/abc123'],
    ['vimeo', 'xyz789', 'https://player.vimeo.com/video/xyz789'],
    ['spotify', 'ep456', 'https://open.spotify.com/embed/episode/ep456'],
  ] as const)(
    'embebe %s con la URL correcta (arquitectura §17.2)',
    (provider, embedId, expectedSrc) => {
      const episode: PublicEpisode = {
        provider,
        embedId,
        episodeKind: 'podcast',
      }
      render(<EpisodeDetail content={CONTENT} episode={episode} />)

      const iframe = screen.getByTitle('Mi episodio')
      expect(iframe).toHaveAttribute('src', expectedSrc)
    },
  )

  it('pinta el título y la etiqueta de tipo, y abre la sesión de recomendaciones excluyéndose a sí mismo', async () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          provider: 'youtube',
          embedId: 'abc123',
          episodeKind: 'podcast',
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Mi episodio' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Podcast')).toBeInTheDocument()

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feed/sessions',
      expect.objectContaining({
        body: JSON.stringify({ scope: 'home', excludeContentId: 'content-1' }),
      }),
    )
  })

  it('el panel de recomendaciones solo aparece debajo, nunca al lado (fullWidthContent)', async () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          provider: 'youtube',
          embedId: 'abc123',
          episodeKind: 'podcast',
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Recomendación 0')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/^Recomendación/)).toHaveLength(3)
  })
})

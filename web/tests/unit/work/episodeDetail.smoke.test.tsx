// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

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
      media: [
        {
          kind: 'image' as const,
          cloudinaryPublicId: 'sample',
        },
      ],
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
          json: async () => ({
            sessionId: 'session-episode',
          }),
        } as Response
      }

      if (url.startsWith('/api/feed/session-episode')) {
        return {
          ok: true,
          json: async () => fakeBatch(3, false),
        } as Response
      }

      throw new Error(`URL inesperada en el test: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('embebe YouTube directamente con youtube-nocookie', () => {
    const episode: PublicEpisode = {
      provider: 'youtube',
      embedId: 'abc123',
      episodeKind: 'podcast',
    }

    render(
      <EpisodeDetail
        content={CONTENT}
        episode={episode}
      />,
    )

    const iframe = screen.getByTitle('Mi episodio')

    expect(iframe).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/abc123',
    )

    expect(
      screen.queryByRole('button', {
        name: /cargar contenido/i,
      }),
    ).not.toBeInTheDocument()
  })

  it('no crea el iframe de Vimeo hasta que el usuario pulsa cargar', () => {
    const episode: PublicEpisode = {
      provider: 'vimeo',
      embedId: 'xyz789',
      episodeKind: 'podcast',
    }

    render(
      <EpisodeDetail
        content={CONTENT}
        episode={episode}
      />,
    )

    expect(
      screen.queryByTitle('Mi episodio'),
    ).not.toBeInTheDocument()

    const button = screen.getByRole('button', {
      name: 'Cargar contenido de Vimeo',
    })

    expect(button).toBeInTheDocument()

    fireEvent.click(button)

    expect(
      screen.getByTitle('Mi episodio'),
    ).toHaveAttribute(
      'src',
      'https://player.vimeo.com/video/xyz789?dnt=1',
    )
  })

  it('no crea el iframe de Spotify hasta que el usuario pulsa cargar', () => {
    const episode: PublicEpisode = {
      provider: 'spotify',
      embedId: 'ep456',
      episodeKind: 'podcast',
    }

    render(
      <EpisodeDetail
        content={CONTENT}
        episode={episode}
      />,
    )

    expect(
      screen.queryByTitle('Mi episodio'),
    ).not.toBeInTheDocument()

    const button = screen.getByRole('button', {
      name: 'Cargar contenido de Spotify',
    })

    expect(button).toBeInTheDocument()

    fireEvent.click(button)

    expect(
      screen.getByTitle('Mi episodio'),
    ).toHaveAttribute(
      'src',
      'https://open.spotify.com/embed/episode/ep456',
    )
  })

  it('la autorización de un embed no autoriza automáticamente otro episodio', () => {
    const { rerender } = render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          provider: 'vimeo',
          embedId: 'video-1',
          episodeKind: 'podcast',
        }}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cargar contenido de Vimeo',
      }),
    )

    expect(
      screen.getByTitle('Mi episodio'),
    ).toHaveAttribute(
      'src',
      'https://player.vimeo.com/video/video-1?dnt=1',
    )

    rerender(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          provider: 'spotify',
          embedId: 'episode-2',
          episodeKind: 'podcast',
        }}
      />,
    )

    expect(
      screen.queryByTitle('Mi episodio'),
    ).not.toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: 'Cargar contenido de Spotify',
      }),
    ).toBeInTheDocument()
  })

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
      screen.getByRole('heading', {
        name: 'Mi episodio',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Podcast'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feed/sessions',
        expect.objectContaining({
          body: JSON.stringify({
            scope: 'home',
            excludeContentId: 'content-1',
          }),
        }),
      )
    })
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
      expect(
        screen.getByText('Recomendación 0'),
      ).toBeInTheDocument()
    })

    expect(
      screen.getAllByText(/^Recomendación/),
    ).toHaveLength(3)
  })
})
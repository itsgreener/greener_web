// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { EpisodeDetail } from '@/app/(public)/work/[slug]/EpisodeDetail'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
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
    round: 0,
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

  beforeEach(() => {
    vi.mocked(trackAnalyticsEvent).mockClear()
    window.history.replaceState({}, '', '/work/mi-episodio')
  })

  it('YouTube tampoco se carga hasta que el usuario pulsa: sin iframe antes, y youtube-nocookie después', () => {
    const episode: PublicEpisode = {
      program: 'brand_the_future',
      provider: 'youtube',
      embedId: 'abc123',
      episodeKind: 'podcast',
    }

    render(<EpisodeDetail content={CONTENT} episode={episode} />)

    expect(screen.queryByTitle('Mi episodio')).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Load YouTube content' }),
    )

    expect(screen.getByTitle('Mi episodio')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/abc123?autoplay=1',
    )
  })

  it('no crea el iframe de Vimeo hasta que el usuario pulsa cargar', () => {
    const episode: PublicEpisode = {
      program: 'brand_the_future',
      provider: 'vimeo',
      embedId: 'xyz789',
      episodeKind: 'podcast',
    }

    render(<EpisodeDetail content={CONTENT} episode={episode} />)

    expect(screen.queryByTitle('Mi episodio')).not.toBeInTheDocument()

    const button = screen.getByRole('button', {
      name: 'Load Vimeo content',
    })

    expect(button).toBeInTheDocument()

    fireEvent.click(button)

    expect(screen.getByTitle('Mi episodio')).toHaveAttribute(
      'src',
      'https://player.vimeo.com/video/xyz789?dnt=1&autoplay=1',
    )
  })

  it('no crea el iframe de Spotify hasta que el usuario pulsa cargar', () => {
    const episode: PublicEpisode = {
      program: 'brand_the_future',
      provider: 'spotify',
      embedId: 'ep456',
      episodeKind: 'podcast',
    }

    render(<EpisodeDetail content={CONTENT} episode={episode} />)

    expect(screen.queryByTitle('Mi episodio')).not.toBeInTheDocument()

    const button = screen.getByRole('button', {
      name: 'Load Spotify content',
    })

    expect(button).toBeInTheDocument()

    fireEvent.click(button)

    expect(screen.getByTitle('Mi episodio')).toHaveAttribute(
      'src',
      'https://open.spotify.com/embed/episode/ep456',
    )
  })

  it('la autorización de un embed no autoriza automáticamente otro episodio', () => {
    const { rerender } = render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
          provider: 'vimeo',
          embedId: 'video-1',
          episodeKind: 'podcast',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Load Vimeo content' }))

    expect(screen.getByTitle('Mi episodio')).toHaveAttribute(
      'src',
      'https://player.vimeo.com/video/video-1?dnt=1&autoplay=1',
    )

    rerender(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
          provider: 'spotify',
          embedId: 'episode-2',
          episodeKind: 'podcast',
        }}
      />,
    )

    expect(screen.queryByTitle('Mi episodio')).not.toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Load Spotify content' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['youtube', 'YouTube'],
    ['vimeo', 'Vimeo'],
    ['spotify', 'Spotify'],
  ] as const)(
    '%s: el aviso nombra al proveedor, enlaza a Privacy & Cookies y no usa lenguaje vago (guía AEPD §3.1.2.1)',
    (provider, label) => {
      render(
        <EpisodeDetail
          content={CONTENT}
          episode={{
            program: 'brand_the_future',
            provider,
            embedId: 'x',
            episodeKind: 'podcast',
          }}
        />,
      )

      const notice = screen
        .getByText(new RegExp(`served by ${label}`))
        .closest('div')!

      expect(notice.textContent).toContain(
        `Nothing is loaded from ${label} until you choose to`,
      )
      expect(notice.textContent).toContain(
        'We do not store your choice, so you will be asked again for each video',
      )
      // La guía desaconseja «puede», «podría», «a menudo»…
      expect(notice.textContent).not.toMatch(
        /\b(may|might|could|possibly|sometimes|often)\b/i,
      )

      const link = screen.getByRole('link', { name: 'Privacy & Cookies' })
      expect(link).toHaveAttribute('href', '/privacy')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))

      // Y hasta pulsar, no hay nada de terceros en la página.
      expect(screen.queryByTitle('Mi episodio')).not.toBeInTheDocument()
      expect(document.querySelector('iframe')).toBeNull()
    },
  )

  it('no guarda la elección: ni cookies ni almacenamiento del navegador, y un nuevo montaje vuelve a preguntar', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const episode: PublicEpisode = {
      program: 'brand_the_future',
      provider: 'vimeo',
      embedId: 'xyz789',
      episodeKind: 'podcast',
    }

    const first = render(<EpisodeDetail content={CONTENT} episode={episode} />)

    fireEvent.click(screen.getByRole('button', { name: 'Load Vimeo content' }))
    expect(screen.getByTitle('Mi episodio')).toBeInTheDocument()

    expect(setItem).not.toHaveBeenCalled()
    expect(document.cookie).toBe('')

    first.unmount()
    render(<EpisodeDetail content={CONTENT} episode={episode} />)

    expect(screen.queryByTitle('Mi episodio')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Load Vimeo content' }),
    ).toBeInTheDocument()
  })

  it('registra "Episode Play" con program/episodeId/provider al pulsar cargar', () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_into_europe',
          provider: 'vimeo',
          embedId: 'xyz789',
          episodeKind: 'podcast',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Load Vimeo content' }))

    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      'Episode Play',
      {
        program: 'brand_into_europe',
        episodeId: 'content-1',
        provider: 'vimeo',
      },
      { interactive: true },
    )
  })

  it('no registra "Episode Play" durante un preview firmado (?preview=)', () => {
    window.history.replaceState({}, '', '/work/mi-episodio?preview=token-test')

    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_to_table',
          provider: 'spotify',
          embedId: 'ep456',
          episodeKind: 'podcast',
        }}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Load Spotify content' }),
    )

    expect(trackAnalyticsEvent).not.toHaveBeenCalled()
    // El preview sigue pudiendo reproducirse — solo se excluye la métrica.
    expect(screen.getByTitle('Mi episodio')).toBeInTheDocument()
  })

  it('"Episode Play" se dispara una sola vez aunque el usuario reintente el clic', () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
          provider: 'vimeo',
          embedId: 'xyz789',
          episodeKind: 'podcast',
        }}
      />,
    )

    const button = screen.getByRole('button', { name: 'Load Vimeo content' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1)
  })

  it('pinta el título y la etiqueta de tipo, y abre la sesión de recomendaciones excluyéndose a sí mismo', async () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
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
          program: 'brand_the_future',
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

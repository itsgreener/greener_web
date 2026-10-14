// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactElement } from 'react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { EpisodeDetail } from '@/components/detail/EpisodeDetail'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import {
  ConsentProvider,
  useConsent,
} from '@/modules/consent/client/ConsentProvider'
import { writeConsentRecord } from '@/modules/consent/client/consentCookie'
import { createConsentRecord } from '@/modules/consent/domain/consent'
import type { PublicContent } from '@/modules/content/domain/publicContent'
import type { FeedBatchResult } from '@/modules/feed/domain/feedReadModels'

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
    batch: 0,
    hasMore,
  }
}

/** Renderiza dentro del proveedor de consentimiento, como en la web real. */
function render(ui: ReactElement) {
  return rtlRender(<ConsentProvider>{ui}</ConsentProvider>)
}

function clearConsentCookie() {
  document.cookie = 'greener_consent=; Max-Age=0; Path=/'
}

function seedConsent(decision: 'accepted' | 'rejected') {
  writeConsentRecord(createConsentRecord(decision))
}

/** Pulsa play y, si hace falta, acepta las cookies en la petición. */
function playAndAccept(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))

  const accept = screen.queryByRole('button', {
    name: 'Accept cookies and play',
  })
  if (accept) fireEvent.click(accept)
}

const POSTER = {
  kind: 'image' as const,
  cloudinaryPublicId: 'portada-1',
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
    clearConsentCookie()
    window.history.replaceState({}, '', '/work/mi-episodio')
  })

  it('antes de aceptar no hay iframe de ningún proveedor, solo la portada y el botón de play', () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        poster={POSTER}
        episode={{
          program: 'brand_the_future',
          provider: 'youtube',
          embedId: 'abc123',
          episodeKind: 'podcast',
        }}
      />,
    )

    expect(document.querySelector('iframe')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Play on YouTube' }),
    ).toBeVisible()

    const img = document.querySelector('img')
    expect(img?.getAttribute('src')).toContain('res.cloudinary.com')
    expect(img?.getAttribute('src')).toContain('portada-1')
    // Ningún recurso que cargue el navegador apunta a un tercero de vídeo
    // (el enlace «Watch more» es un <a>: no descarga nada).
    const loaded = Array.from(
      document.querySelectorAll('[src], [srcset], link[href], script'),
    ).map((el) => `${el.getAttribute('src')} ${el.getAttribute('srcset')}`)
    expect(loaded.join(' ')).not.toMatch(/youtube|spotify/i)
  })

  it.each([
    [
      'youtube',
      'YouTube',
      'https://www.youtube-nocookie.com/embed/abc123?autoplay=1',
    ],
    ['spotify', 'Spotify', 'https://open.spotify.com/embed/episode/abc123'],
  ] as const)(
    '%s: sin decisión previa, play pregunta y «Accept cookies and play» monta el reproductor',
    (provider, label, src) => {
      render(
        <EpisodeDetail
          content={CONTENT}
          episode={{
            program: 'brand_the_future',
            provider,
            embedId: 'abc123',
            episodeKind: 'podcast',
          }}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: `Play on ${label}` }))

      // Pregunta, todavía sin iframe.
      expect(document.querySelector('iframe')).toBeNull()
      expect(screen.getByText(new RegExp(`served by ${label}`))).toBeVisible()

      fireEvent.click(
        screen.getByRole('button', { name: 'Accept cookies and play' }),
      )

      expect(screen.getByTitle('Mi episodio')).toHaveAttribute('src', src)
      expect(document.cookie).toContain('greener_consent=')
    },
  )

  it('«Not now» cierra la petición sin cargar nada ni guardar decisión', () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
          provider: 'youtube',
          embedId: 'xyz789',
          episodeKind: 'podcast',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Play on YouTube' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(document.querySelector('iframe')).toBeNull()
    expect(document.cookie).not.toContain('greener_consent')
    expect(
      screen.getByRole('button', { name: 'Play on YouTube' }),
    ).toBeVisible()
    expect(trackAnalyticsEvent).not.toHaveBeenCalledWith(
      'Episode Play',
      expect.anything(),
      expect.anything(),
    )
  })

  it('con cookies ya aceptadas, un clic en play monta el reproductor sin volver a preguntar', () => {
    seedConsent('accepted')

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

    fireEvent.click(screen.getByRole('button', { name: 'Play on YouTube' }))

    expect(
      screen.queryByRole('button', { name: 'Accept cookies and play' }),
    ).not.toBeInTheDocument()
    expect(screen.getByTitle('Mi episodio')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/abc123?autoplay=1',
    )
  })

  it('con cookies rechazadas, play vuelve a preguntar y no monta nada', () => {
    seedConsent('rejected')

    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
          provider: 'spotify',
          embedId: 'ep456',
          episodeKind: 'podcast',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Play on Spotify' }))

    expect(document.querySelector('iframe')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Accept cookies and play' }),
    ).toBeVisible()
  })

  it('al revocar el consentimiento el reproductor se desmonta', () => {
    seedConsent('accepted')

    function RevokeButton() {
      const { reject } = useConsent()
      return (
        <button type="button" onClick={reject}>
          Revoke
        </button>
      )
    }

    render(
      <>
        <RevokeButton />
        <EpisodeDetail
          content={CONTENT}
          episode={{
            program: 'brand_the_future',
            provider: 'youtube',
            embedId: 'xyz789',
            episodeKind: 'podcast',
          }}
        />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Play on YouTube' }))
    expect(screen.getByTitle('Mi episodio')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    expect(document.querySelector('iframe')).toBeNull()
  })

  it('la autorización de un embed no autoriza automáticamente otro episodio', () => {
    seedConsent('accepted')

    const { rerender } = render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
          provider: 'youtube',
          embedId: 'video-1',
          episodeKind: 'podcast',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Play on YouTube' }))

    expect(screen.getByTitle('Mi episodio')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/video-1?autoplay=1',
    )

    rerender(
      <ConsentProvider>
        <EpisodeDetail
          content={CONTENT}
          episode={{
            program: 'brand_the_future',
            provider: 'spotify',
            embedId: 'episode-2',
            episodeKind: 'podcast',
          }}
        />
      </ConsentProvider>,
    )

    expect(screen.queryByTitle('Mi episodio')).not.toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Play on Spotify' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['youtube', 'YouTube'],
    ['spotify', 'Spotify'],
  ] as const)(
    '%s: la petición nombra al proveedor, enlaza a Privacy & Cookies y no usa lenguaje vago (guía AEPD §3.1.2.1)',
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

      fireEvent.click(screen.getByRole('button', { name: `Play on ${label}` }))

      const notice = screen
        .getByText(new RegExp(`served by ${label}`))
        .closest('div')!

      expect(notice.textContent).toContain(
        `Nothing is loaded from ${label} until you accept cookies`,
      )
      expect(notice.textContent).toContain('Your choice is remembered')
      // La guía desaconseja «puede», «podría», «a menudo»…
      expect(notice.textContent).not.toMatch(
        /\b(may|might|could|possibly|sometimes|often)\b/i,
      )

      const link = screen.getByRole('link', { name: 'Privacy & Cookies' })
      expect(link).toHaveAttribute('href', '/privacy')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))

      // Y hasta aceptar, no hay nada de terceros en la página.
      expect(document.querySelector('iframe')).toBeNull()
    },
  )

  it('aceptar para reproducir solo guarda la cookie propia de consentimiento, nada en el almacenamiento del navegador', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
          provider: 'youtube',
          embedId: 'xyz789',
          episodeKind: 'podcast',
        }}
      />,
    )

    playAndAccept('Play on YouTube')

    expect(screen.getByTitle('Mi episodio')).toBeInTheDocument()
    expect(setItem).not.toHaveBeenCalled()
    expect(
      document.cookie.split(';').map((c) => c.trim().split('=')[0]),
    ).toEqual(['greener_consent'])
  })

  it('registra "Episode Play" con program/episodeId/provider al pulsar cargar', () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_into_europe',
          provider: 'youtube',
          embedId: 'xyz789',
          episodeKind: 'podcast',
        }}
      />,
    )

    playAndAccept('Play on YouTube')

    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      'Episode Play',
      {
        program: 'brand_into_europe',
        episodeId: 'content-1',
        provider: 'youtube',
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

    playAndAccept('Play on Spotify')

    expect(trackAnalyticsEvent).not.toHaveBeenCalledWith(
      'Episode Play',
      expect.anything(),
      expect.anything(),
    )
    // El preview sigue pudiendo reproducirse — solo se excluye la métrica.
    expect(screen.getByTitle('Mi episodio')).toBeInTheDocument()
  })

  it('"Episode Play" se dispara una sola vez aunque el usuario reintente el clic', () => {
    render(
      <EpisodeDetail
        content={CONTENT}
        episode={{
          program: 'brand_the_future',
          provider: 'youtube',
          embedId: 'xyz789',
          episodeKind: 'podcast',
        }}
      />,
    )

    const play = screen.getByRole('button', { name: 'Play on YouTube' })
    fireEvent.click(play)
    const accept = screen.getByRole('button', {
      name: 'Accept cookies and play',
    })
    fireEvent.click(accept)
    // Ya no existen ni el botón ni la petición: un segundo clic no repite.
    fireEvent.click(accept)

    expect(
      vi
        .mocked(trackAnalyticsEvent)
        .mock.calls.filter(([name]) => name === 'Episode Play'),
    ).toHaveLength(1)
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
            scope: 'channel',
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

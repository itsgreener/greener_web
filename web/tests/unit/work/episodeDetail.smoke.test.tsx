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

const {
  mockTrackAnalyticsEvent,
} = vi.hoisted(() => ({
  mockTrackAnalyticsEvent:
    vi.fn(),
}))

vi.mock(
  '@/modules/analytics/analytics',
  () => ({
    trackAnalyticsEvent:
      mockTrackAnalyticsEvent,
  }),
)

import {
  EpisodeDetail,
} from '@/app/(public)/work/[slug]/EpisodeDetail'

import type {
  PublicContent,
} from '@/modules/content/infrastructure/publicContentSource'

import type {
  PublicEpisode,
} from '@/modules/content/infrastructure/publicEpisodeSource'

import type {
  FeedBatchResult,
} from '@/modules/feed/application/getFeedSessionBatch'

const CONTENT:
  PublicContent = {
  id:
    'content-1',

  type:
    'episode',

  slug:
    'mi-episodio',

  defaultLocale:
    'es',

  locale:
    'es',

  availableLocales: [
    'es',
  ],

  title:
    'Mi episodio',

  seoTitle:
    null,

  seoDescription:
    null,

  summary:
    null,

  highlight:
    null,

  body:
    null,

  coverMedia:
    null,

  coverRatio:
    null,
}

function episode(
  provider:
    PublicEpisode['provider'],
  embedId:
    string,
): PublicEpisode {
  return {
    program:
      'brand_the_future',

    provider,

    embedId,

    episodeKind:
      'podcast',
  }
}

function fakeBatch(
  count: number,
  hasMore: boolean,
): FeedBatchResult {
  return {
    items:
      Array.from(
        {
          length:
            count,
        },
        (_, i) => ({
          pinId:
            `rec-pin-${i}`,

          contentId:
            `rec-content-${i}`,

          kind:
            'case',

          destination:
            `/work/rec-${i}`,

          ratio:
            '1:1',

          label:
            `Recomendación ${i}`,

          cta:
            'Watch',

          alt:
            `Alt ${i}`,

          autoplayMode:
            null,

          media: [
            {
              kind:
                'image' as const,

              cloudinaryPublicId:
                'sample',
            },
          ],
        }),
      ),

    cursor:
      'cursor-1',

    hasMore,
  }
}

describe(
  'EpisodeDetail — prueba de humo',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()

      window.history.replaceState(
        {},
        '',
        '/work/mi-episodio',
      )

      global.ResizeObserver =
        class {
          callback:
            ResizeObserverCallback

          constructor(
            callback:
              ResizeObserverCallback,
          ) {
            this.callback =
              callback
          }

          observe() {
            this.callback(
              [
                {
                  contentRect:
                    {
                      width:
                        1200,
                    },
                } as ResizeObserverEntry,
              ],
              this as unknown as ResizeObserver,
            )
          }

          disconnect() {}

          unobserve() {}
        }

      // @ts-expect-error -- stub mínimo suficiente para el smoke test
      global.IntersectionObserver =
        class {
          observe() {}

          disconnect() {}
        }

      global.fetch =
        vi.fn(
          async (
            url:
              string,
            init?:
              RequestInit,
          ) => {
            if (
              url ===
                '/api/feed/sessions' &&
              init?.method ===
                'POST'
            ) {
              return {
                ok:
                  true,

                json:
                  async () => ({
                    sessionId:
                      'session-episode',
                  }),
              } as Response
            }

            if (
              url.startsWith(
                '/api/feed/session-episode',
              )
            ) {
              return {
                ok:
                  true,

                json:
                  async () =>
                    fakeBatch(
                      3,
                      false,
                    ),
              } as Response
            }

            throw new Error(
              `URL inesperada en el test: ${url}`,
            )
          },
        ) as typeof fetch
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it(
      'YouTube no carga antes del clic y registra Episode Play al reproducir',
      () => {
        render(
          <EpisodeDetail
            content={
              CONTENT
            }
            episode={episode(
              'youtube',
              'abc123',
            )}
          />,
        )

        expect(
          screen.queryByTitle(
            'Mi episodio',
          ),
        ).not
          .toBeInTheDocument()

        const button =
          screen.getByRole(
            'button',
            {
              name:
                'Reproducir episodio en YouTube',
            },
          )

        fireEvent.click(
          button,
        )

        expect(
          mockTrackAnalyticsEvent,
        ).toHaveBeenCalledWith(
          'Episode Play',
          {
            program:
              'brand_the_future',

            episodeId:
              'content-1',

            provider:
              'youtube',
          },
          {
            interactive:
              true,
          },
        )

        expect(
          screen.getByTitle(
            'Mi episodio',
          ),
        ).toHaveAttribute(
          'src',
          'https://www.youtube-nocookie.com/embed/abc123?autoplay=1',
        )
      },
    )

    it(
      'Vimeo no carga antes del clic y conserva dnt=1',
      () => {
        render(
          <EpisodeDetail
            content={
              CONTENT
            }
            episode={episode(
              'vimeo',
              'xyz789',
            )}
          />,
        )

        expect(
          screen.queryByTitle(
            'Mi episodio',
          ),
        ).not
          .toBeInTheDocument()

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Reproducir episodio en Vimeo',
            },
          ),
        )

        expect(
          mockTrackAnalyticsEvent,
        ).toHaveBeenCalledWith(
          'Episode Play',
          {
            program:
              'brand_the_future',

            episodeId:
              'content-1',

            provider:
              'vimeo',
          },
          {
            interactive:
              true,
          },
        )

        expect(
          screen.getByTitle(
            'Mi episodio',
          ),
        ).toHaveAttribute(
          'src',
          'https://player.vimeo.com/video/xyz789?dnt=1&autoplay=1',
        )
      },
    )

    it(
      'Spotify no carga antes del clic y registra Episode Play',
      () => {
        render(
          <EpisodeDetail
            content={
              CONTENT
            }
            episode={episode(
              'spotify',
              'ep456',
            )}
          />,
        )

        expect(
          screen.queryByTitle(
            'Mi episodio',
          ),
        ).not
          .toBeInTheDocument()

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Reproducir episodio en Spotify',
            },
          ),
        )

        expect(
          mockTrackAnalyticsEvent,
        ).toHaveBeenCalledWith(
          'Episode Play',
          {
            program:
              'brand_the_future',

            episodeId:
              'content-1',

            provider:
              'spotify',
          },
          {
            interactive:
              true,
          },
        )

        expect(
          screen.getByTitle(
            'Mi episodio',
          ),
        ).toHaveAttribute(
          'src',
          'https://open.spotify.com/embed/episode/ep456',
        )
      },
    )

    it(
      'la autorización de un embed no autoriza automáticamente otro episodio',
      () => {
        const {
          rerender,
        } = render(
          <EpisodeDetail
            content={
              CONTENT
            }
            episode={episode(
              'vimeo',
              'video-1',
            )}
          />,
        )

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Reproducir episodio en Vimeo',
            },
          ),
        )

        expect(
          screen.getByTitle(
            'Mi episodio',
          ),
        ).toHaveAttribute(
          'src',
          'https://player.vimeo.com/video/video-1?dnt=1&autoplay=1',
        )

        rerender(
          <EpisodeDetail
            content={
              CONTENT
            }
            episode={episode(
              'spotify',
              'episode-2',
            )}
          />,
        )

        expect(
          screen.queryByTitle(
            'Mi episodio',
          ),
        ).not
          .toBeInTheDocument()

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Reproducir episodio en Spotify',
            },
          ),
        ).toBeInTheDocument()
      },
    )

    it(
      'no registra Episode Play durante un preview firmado',
      () => {
        window.history.replaceState(
          {},
          '',
          '/work/mi-episodio?preview=test-token',
        )

        render(
          <EpisodeDetail
            content={
              CONTENT
            }
            episode={episode(
              'youtube',
              'abc123',
            )}
          />,
        )

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Reproducir episodio en YouTube',
            },
          ),
        )

        expect(
          mockTrackAnalyticsEvent,
        ).not
          .toHaveBeenCalled()

        expect(
          screen.getByTitle(
            'Mi episodio',
          ),
        ).toBeInTheDocument()
      },
    )

    it(
      'pinta el título y la etiqueta de tipo, y abre la sesión de recomendaciones excluyéndose a sí mismo',
      async () => {
        render(
          <EpisodeDetail
            content={
              CONTENT
            }
            episode={episode(
              'youtube',
              'abc123',
            )}
          />,
        )

        expect(
          screen.getByRole(
            'heading',
            {
              name:
                'Mi episodio',
            },
          ),
        ).toBeInTheDocument()

        expect(
          screen.getByText(
            'Podcast',
          ),
        ).toBeInTheDocument()

        await waitFor(
          () => {
            expect(
              global.fetch,
            ).toHaveBeenCalledWith(
              '/api/feed/sessions',
              expect.objectContaining(
                {
                  body:
                    JSON.stringify(
                      {
                        scope:
                          'home',

                        excludeContentId:
                          'content-1',
                      },
                    ),
                },
              ),
            )
          },
        )
      },
    )

    it(
      'el panel de recomendaciones solo aparece debajo, nunca al lado',
      async () => {
        render(
          <EpisodeDetail
            content={
              CONTENT
            }
            episode={episode(
              'youtube',
              'abc123',
            )}
          />,
        )

        await waitFor(
          () => {
            expect(
              screen.getByText(
                'Recomendación 0',
              ),
            ).toBeInTheDocument()
          },
        )

        expect(
          screen.getAllByText(
            /^Recomendación/,
          ),
        ).toHaveLength(
          3,
        )
      },
    )
  },
)
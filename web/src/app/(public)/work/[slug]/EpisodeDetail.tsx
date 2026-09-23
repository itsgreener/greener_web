'use client'

import {
  useState,
} from 'react'

import {
  PinCard,
} from '@/components/pin/PinCard'

import {
  useRecommendationMasonry,
} from '@/components/detail/useRecommendationMasonry'

import type {
  PublicContent,
} from '@/modules/content/infrastructure/publicContentSource'

import type {
  PublicEpisode,
} from '@/modules/content/infrastructure/publicEpisodeSource'

import styles from './EpisodeDetail.module.css'

const EPISODE_RATIO =
  '16:9' as const

function embedUrl(
  episode:
    PublicEpisode,
): string {
  switch (
    episode.provider
  ) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${episode.embedId}`

    case 'vimeo':
      return `https://player.vimeo.com/video/${episode.embedId}?dnt=1`

    case 'spotify':
      return `https://open.spotify.com/embed/episode/${episode.embedId}`
  }
}

function episodeKindLabel(
  kind:
    PublicEpisode['episodeKind'],
): string {
  switch (kind) {
    case 'podcast':
      return 'Podcast'
  }
}

function providerLabel(
  provider:
    PublicEpisode['provider'],
): string {
  switch (provider) {
    case 'youtube':
      return 'YouTube'

    case 'vimeo':
      return 'Vimeo'

    case 'spotify':
      return 'Spotify'
  }
}

function requiresClickToLoad(
  provider:
    PublicEpisode['provider'],
): boolean {
  return (
    provider ===
      'vimeo' ||
    provider ===
      'spotify'
  )
}

export function EpisodeDetail({
  content,
  episode,
}: {
  content:
    PublicContent

  episode:
    PublicEpisode
}) {
  const [
    approvedEmbedKey,
    setApprovedEmbedKey,
  ] =
    useState<
      string | null
    >(null)

  const embedKey =
    `${episode.provider}:${episode.embedId}`

  const needsConsent =
    requiresClickToLoad(
      episode.provider,
    )

  const canRenderEmbed =
    !needsConsent ||
    approvedEmbedKey ===
      embedKey

  const provider =
    providerLabel(
      episode.provider,
    )

  const {
    containerRef,
    contentBlockImageWidth,
    contentBlockImageHeight,
    contentBlockReservedWidth,
    totalHeight,
    positioned,
    isLoading,
    itemCount,
    hasMore,
    error,
    sentinelId,
  } =
    useRecommendationMasonry(
      content.id,
      EPISODE_RATIO,
      {
        fullWidthContent:
          true,
      },
    )

  return (
    <article
      className={
        styles.article
      }
    >
      <div
        ref={
          containerRef
        }
        className={
          styles.canvas
        }
        style={{
          height:
            totalHeight ||
            undefined,
        }}
      >
        <div
          className={
            styles.contentBlock
          }
          style={{
            width:
              contentBlockReservedWidth ||
              '100%',
          }}
        >
          <div
            className={
              styles.embedWrapper
            }
            style={{
              width:
                contentBlockImageWidth ||
                '100%',

              height:
                contentBlockImageHeight ||
                undefined,
            }}
          >
            {canRenderEmbed ? (
              <iframe
                src={embedUrl(
                  episode,
                )}
                title={
                  content.title
                }
                className={
                  styles.embed
                }
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <div
                className={
                  styles.embedConsent
                }
              >
                <p
                  className={
                    styles.embedConsentTitle
                  }
                >
                  Contenido de{' '}
                  {provider}
                </p>

                <p
                  className={
                    styles.embedConsentText
                  }
                >
                  Este
                  contenido lo
                  sirve{' '}
                  {provider}. Al
                  cargarlo, tu
                  navegador se
                  conectará con
                  este
                  proveedor,
                  que puede
                  tratar datos
                  y utilizar
                  cookies o
                  tecnologías
                  similares.
                </p>

                <button
                  type="button"
                  className={
                    styles.embedConsentButton
                  }
                  onClick={() =>
                    setApprovedEmbedKey(
                      embedKey,
                    )
                  }
                >
                  Cargar
                  contenido
                  de{' '}
                  {provider}
                </button>
              </div>
            )}
          </div>

          <div
            className={
              styles.text
            }
          >
            <p
              className={
                styles.kind
              }
            >
              {episodeKindLabel(
                episode.episodeKind,
              )}
            </p>

            <h1
              className={
                styles.title
              }
            >
              {content.title}
            </h1>

            {content.highlight && (
              <p
                className={
                  styles.highlight
                }
              >
                {
                  content.highlight
                }
              </p>
            )}

            {content.body && (
              <p
                className={
                  styles.body
                }
              >
                {content.body}
              </p>
            )}
          </div>
        </div>

        {positioned.map(
          (p) => (
            <PinCard
              key={
                p.item
                  .pinId
              }
              pin={
                p.item
              }
              style={{
                x:
                  p.x,

                y:
                  p.y,

                width:
                  p.width,

                height:
                  p.height,
              }}
              analyticsContext={{
                section:
                  'recommendations',

                destinationType:
                  p.item
                    .kind,
              }}
            />
          ),
        )}
      </div>

      <div
        id={
          sentinelId
        }
        className={
          styles.sentinel
        }
      />

      {error && (
        <p
          className={
            styles.status
          }
        >
          {error}
        </p>
      )}

      {isLoading &&
        itemCount ===
          0 && (
          <p
            className={
              styles.status
            }
          >
            Cargando
            recomendaciones…
          </p>
        )}

      {!isLoading &&
        itemCount ===
          0 &&
        !hasMore && (
          <p
            className={
              styles.status
            }
          >
            Todavía no hay
            contenido
            publicado para
            recomendar.
          </p>
        )}
    </article>
  )
}
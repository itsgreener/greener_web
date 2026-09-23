'use client'

import Link from 'next/link'

import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoFullUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'

import type {
  PublicContent,
} from '@/modules/content/infrastructure/publicContentSource'

import {
  PinCard,
} from '@/components/pin/PinCard'

import {
  useRecommendationMasonry,
} from './useRecommendationMasonry'

import styles from './ToolInsightDetail.module.css'

const FALLBACK_RATIO =
  '4:5' as const

export function ToolInsightDetail({
  content,
  ctaLabel,
  appHref,
}: {
  content:
    PublicContent

  ctaLabel?:
    string

  appHref?:
    string
}) {
  const ratio =
    content.coverRatio ??
    FALLBACK_RATIO

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
      ratio,
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
          {content.coverMedia && (
            <div
              className={
                styles.cover
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
              {content
                .coverMedia
                .kind ===
              'video' ? (
                <video
                  src={buildVideoFullUrl(
                    content
                      .coverMedia
                      .cloudinaryPublicId,
                  )}
                  poster={buildVideoPosterUrl(
                    content
                      .coverMedia
                      .cloudinaryPublicId,
                  )}
                  controls
                  aria-label={
                    content.title
                  }
                  className={
                    styles.coverImage
                  }
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={buildImageUrl(
                    content
                      .coverMedia
                      .cloudinaryPublicId,
                    'detail',
                  )}
                  srcSet={buildImageSrcSet(
                    content
                      .coverMedia
                      .cloudinaryPublicId,
                    'detail',
                  )}
                  sizes="83vw"
                  alt={
                    content.title
                  }
                  loading="eager"
                  className={
                    styles.coverImage
                  }
                />
              )}
            </div>
          )}

          <div
            className={
              styles.text
            }
          >
            <h1
              className={
                styles.title
              }
            >
              {content.title}
            </h1>

            {content.summary && (
              <p
                className={
                  styles.summary
                }
              >
                {
                  content.summary
                }
              </p>
            )}

            {ctaLabel &&
              appHref && (
                <Link
                  href={
                    appHref
                  }
                  className={
                    styles.cta
                  }
                >
                  {ctaLabel}
                </Link>
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
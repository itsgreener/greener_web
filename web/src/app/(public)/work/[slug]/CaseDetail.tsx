'use client'

import Link from 'next/link'

import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoFullUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'

import {
  widestCarouselRatio,
} from '@/modules/media/domain/closestRatio'

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
  PublicCaseDetail,
  PublicCaseCarouselItem,
} from '@/modules/content/infrastructure/publicCaseSource'

import styles from './CaseDetail.module.css'

const CSS_ASPECT_RATIO:
  Record<string, string> =
  {
    '1:1':
      '1 / 1',

    '4:3':
      '4 / 3',

    '4:5':
      '4 / 5',

    '3:4':
      '3 / 4',

    '2:3':
      '2 / 3',

    '9:16':
      '9 / 16',

    '16:9':
      '16 / 9',
  }

const FALLBACK_RATIO =
  '16:9' as const

export function CaseDetail({
  content,
  caseDetail,
  carousel,
}: {
  content:
    PublicContent

  caseDetail:
    PublicCaseDetail | null

  carousel:
    PublicCaseCarouselItem[]
}) {
  const carouselRatio =
    carousel.length > 0
      ? widestCarouselRatio(
          carousel,
        )
      : FALLBACK_RATIO

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
      carouselRatio,
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
          {carousel.length >
            0 && (
            <div
              className={
                styles.carousel
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
              {carousel.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={
                      item.mediaId
                    }
                    className={
                      styles.slide
                    }
                    style={{
                      aspectRatio:
                        CSS_ASPECT_RATIO[
                          carouselRatio
                        ],
                    }}
                  >
                    {item.kind ===
                    'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={buildImageUrl(
                          item.cloudinaryPublicId,
                          'detail',
                        )}
                        srcSet={buildImageSrcSet(
                          item.cloudinaryPublicId,
                          'detail',
                        )}
                        sizes="83vw"
                        alt={
                          item.alt
                        }
                        loading={
                          index ===
                          0
                            ? 'eager'
                            : 'lazy'
                        }
                        className={
                          styles.media
                        }
                      />
                    ) : (
                      <video
                        src={buildVideoFullUrl(
                          item.cloudinaryPublicId,
                        )}
                        poster={buildVideoPosterUrl(
                          item.cloudinaryPublicId,
                        )}
                        controls
                        aria-label={
                          item.alt
                        }
                        className={
                          styles.media
                        }
                      />
                    )}
                  </div>
                ),
              )}
            </div>
          )}

          <div
            className={
              styles.text
            }
          >
            {content
              .availableLocales
              .length >
              1 && (
              <nav
                className={
                  styles.localeSelector
                }
                aria-label="Idioma"
              >
                {content.availableLocales.map(
                  (
                    loc,
                  ) => (
                    <Link
                      key={
                        loc
                      }
                      href={
                        loc ===
                        content.defaultLocale
                          ? `/work/${content.slug}`
                          : `/work/${content.slug}/${loc}`
                      }
                      aria-current={
                        loc ===
                        content.locale
                          ? 'page'
                          : undefined
                      }
                      className={
                        styles.localeLink
                      }
                    >
                      {loc.toUpperCase()}
                    </Link>
                  ),
                )}
              </nav>
            )}

            {caseDetail?.client && (
              <p
                className={
                  styles.client
                }
              >
                {
                  caseDetail.client
                }
              </p>
            )}

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
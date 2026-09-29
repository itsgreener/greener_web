'use client'

import Link from 'next/link'
import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoFullUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import { ContentOpenTracker } from '@/modules/analytics/ContentOpenTracker'
import { PinCard } from '@/components/pin/PinCard'
import { useRecommendationMasonry } from './useRecommendationMasonry'
import styles from './ToolInsightDetail.module.css'

// especificacion-final-formato-detalle.md §2: fuera de la tabla de
// ratios cerrados (sin cover_ratio todavía, contenido sin portada) no
// hay columnas que reservar — se trata como el caso "vertical" más
// conservador (3 columnas de contenido a 6 totales) en vez de reventar,
// hasta que exista portada real.
const FALLBACK_RATIO = '4:5' as const

/**
 * Plantilla de detalle tipo A (especificacion-final-formato-detalle.md
 * §1, §2, §7): portada a altura fija × ratio (nunca medida en columnas),
 * bloque de contenido reservando 3-5 columnas según el grupo de ratio, y
 * panel de recomendaciones aleatorias (scope='home', excluyendo este
 * mismo contenido) a la derecha + debajo, un único masonry sembrado de
 * forma asimétrica (useRecommendationMasonry) — no dos retículas
 * separadas.
 *
 * También sirve a contenido libre (`other`, /variety/[slug], §3: "igual
 * que tool/insight, sin CTA, sin paquete HTML — cover_media_id admite
 * imagen o vídeo"): de ahí que `ctaLabel`/`appHref` sean opcionales (sin
 * los dos, no se pinta ningún CTA) y que la portada pueda ser vídeo, no
 * solo imagen. Los eventos "Tool Open"/"Insight Open" (§18.2, añadidos
 * el 29 sep) solo se disparan para esos dos tipos — `other` no tiene
 * evento propio todavía.
 */
export function ToolInsightDetail({
  content,
  ctaLabel,
  appHref,
}: {
  content: PublicContent
  ctaLabel?: string
  appHref?: string
}) {
  const ratio = content.coverRatio ?? FALLBACK_RATIO

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
  } = useRecommendationMasonry(content.id, ratio)

  return (
    <article className={styles.article}>
      {content.type === 'tool' && (
        <ContentOpenTracker type="tool" contentId={content.id} />
      )}
      {content.type === 'insight' && (
        <ContentOpenTracker type="insight" contentId={content.id} />
      )}

      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ height: totalHeight || undefined }}
      >
        <div
          className={styles.contentBlock}
          style={{
            width: contentBlockReservedWidth || '100%',
          }}
        >
          {content.coverMedia && (
            <div
              className={styles.cover}
              style={{
                width: contentBlockImageWidth || '100%',
                height: contentBlockImageHeight || undefined,
              }}
            >
              {content.coverMedia.kind === 'video' ? (
                <video
                  src={buildVideoFullUrl(content.coverMedia.cloudinaryPublicId)}
                  poster={buildVideoPosterUrl(
                    content.coverMedia.cloudinaryPublicId,
                  )}
                  controls
                  aria-label={content.title}
                  className={styles.coverImage}
                />
              ) : (
                // URL ya transformada por
                // modules/media/infrastructure/cloudinaryUrl.ts
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={buildImageUrl(
                    content.coverMedia.cloudinaryPublicId,
                    'detail',
                  )}
                  srcSet={buildImageSrcSet(
                    content.coverMedia.cloudinaryPublicId,
                    'detail',
                  )}
                  sizes="83vw"
                  alt={content.title}
                  loading="eager"
                  className={styles.coverImage}
                />
              )}
            </div>
          )}

          <div className={styles.text}>
            <h1 className={styles.title}>{content.title}</h1>
            {content.summary && (
              <p className={styles.summary}>{content.summary}</p>
            )}
            {ctaLabel && appHref && (
              <Link href={appHref} className={styles.cta}>
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>

        {positioned.map((p) => (
          <PinCard
            key={p.item.pinId}
            pin={p.item}
            style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
            analyticsContext={{
              section: 'recommendations',
              destinationType: p.item.kind,
            }}
          />
        ))}
      </div>

      <div id={sentinelId} className={styles.sentinel} />

      {error && <p className={styles.status}>{error}</p>}
      {isLoading && itemCount === 0 && (
        <p className={styles.status}>Cargando recomendaciones…</p>
      )}
      {!isLoading && itemCount === 0 && !hasMore && (
        <p className={styles.status}>
          Todavía no hay contenido publicado para recomendar.
        </p>
      )}
    </article>
  )
}

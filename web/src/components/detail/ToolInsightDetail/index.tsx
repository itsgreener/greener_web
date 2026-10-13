'use client'

import Link from 'next/link'
import type {
  PublicContent,
  PublicContentMedia,
} from '@/modules/content/domain/publicContent'
import { toolInsightDetailRatio } from '@/modules/media/domain/detailVideoRatio'
import { ContentOpenTracker } from '@/modules/analytics/ContentOpenTracker'
import { RecommendationsGrid } from '@/components/detail/RecommendationsGrid'
import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'
import { CoverMedia } from './CoverMedia'
import styles from './ToolInsightDetail.module.css'

import type { PinRatioValue } from '@/modules/shared/domain/ratio'
/**
 * Plantilla de detalle tipo A (especificacion-final-formato-detalle.md
 * §1, §2, §7): portada a altura fija × ratio (nunca medida en columnas),
 * bloque de contenido reservando 3-5 columnas según el grupo de ratio, y
 * panel de recomendaciones de la misma sección (Tool → Tools,
 * Insight → Insights; Other conserva Home, excluyendo este mismo contenido)
 * a la derecha + debajo, un único masonry sembrado de forma asimétrica
 * (useRecommendationMasonry) — no dos retículas separadas.
 *
 * También sirve a contenido libre (`other`, /variety/[slug], §3: "igual
 * que tool/insight, sin CTA, sin paquete HTML — cover_media_id admite
 * imagen o vídeo"): de ahí que `ctaLabel`/`appHref` sean opcionales (sin
 * los dos, no se pinta ningún CTA) y que la portada pueda ser vídeo, no
 * solo imagen. Los eventos "Tool Open"/"Insight Open" (§18.2) solo se disparan para esos dos tipos — `other` no tiene
 * evento propio.
 */
export function ToolInsightDetail({
  content,
  ctaLabel,
  appHref,
  coverMediaOverride,
  coverRatioOverride,
  coverAltOverride,
}: {
  content: PublicContent
  ctaLabel?: string
  appHref?: string
  // En Tools, cuando la ficha se abre desde un pin, la portada puede ser
  // el medio exacto de ese pin en vez de la portada general del contenido.
  // Insights/Other no pasan estos props y conservan el comportamiento actual.
  coverMediaOverride?: PublicContentMedia | null
  coverRatioOverride?: PinRatioValue | null
  // Alt del pin de origen. Hoy solo lo usa el vídeo de una tool (alt
  // obligatorio); la imagen conserva su alt de siempre.
  coverAltOverride?: string | null
}) {
  const coverMedia = coverMediaOverride ?? content.coverMedia
  // Ratio compartido con el calentamiento de vídeo (fase 2): ver
  // modules/media/domain/detailVideoRatio.ts. Sin ratio (contenido sin
  // portada) se usa el caso «vertical» más conservador.
  const ratio = toolInsightDetailRatio(coverRatioOverride, content.coverRatio)
  const recommendationScope =
    content.type === 'tool'
      ? 'tools'
      : content.type === 'insight'
        ? 'insights'
        : 'home'

  const recommendations = useRecommendationMasonry(content.id, ratio, {
    textColumn: true,
    scope: recommendationScope,
  })
  const {
    contentBlockImageWidth,
    contentBlockImageHeight,
    contentBlockReservedWidth,
    contentBlockTextWidth,
  } = recommendations

  return (
    <article className={styles.article}>
      {content.type === 'tool' && (
        <ContentOpenTracker type="tool" contentId={content.id} />
      )}
      {content.type === 'insight' && (
        <ContentOpenTracker type="insight" contentId={content.id} />
      )}

      <RecommendationsGrid recommendations={recommendations}>
        <div
          className={styles.contentBlock}
          style={{
            width: contentBlockReservedWidth || '100%',
          }}
        >
          {coverMedia && (
            <div
              className={styles.cover}
              style={{
                width: contentBlockImageWidth || '100%',
                height: contentBlockImageHeight || undefined,
              }}
            >
              <CoverMedia
                media={coverMedia}
                title={content.title}
                alt={coverAltOverride}
                ratio={ratio}
                isTool={content.type === 'tool'}
                boxWidthPx={contentBlockImageWidth}
                boxHeightPx={contentBlockImageHeight}
              />
            </div>
          )}

          <div
            className={styles.text}
            style={
              contentBlockTextWidth
                ? ({
                    // Ancho real que queda para el texto (ver
                    // computeContentBlockGeometry): nunca menos de una
                    // columna y puede ocupar más si la imagen deja hueco.
                    '--text-column-width': `${contentBlockTextWidth}px`,
                  } as React.CSSProperties)
                : undefined
            }
          >
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
      </RecommendationsGrid>
    </article>
  )
}

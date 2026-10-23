'use client'

import { CtaLink } from '@/components/cta/Cta'
import type {
  PublicContent,
  PublicPinCover,
} from '@/modules/content/domain/publicContent'
import { toolInsightDetailRatio } from '@/modules/media/domain/detailVideoRatio'
import { ContentOpenTracker } from '@/modules/analytics/ContentOpenTracker'
import { RecommendationsGrid } from '@/components/detail/RecommendationsGrid'
import { useRecommendationMasonry } from '@/components/detail/useRecommendationMasonry'
import { CoverMedia } from './CoverMedia'
import styles from './ToolInsightDetail.module.css'

/**
 * Plantilla de detalle tipo A (especificacion-final-formato-detalle.md
 * §1, §2, §7) de tool e insight: cover a altura fija × ratio (nunca medida
 * en columnas), bloque de contenido reservando 3-5 columnas según el grupo
 * de ratio, y panel de recomendaciones de la misma sección (Tool → Tools,
 * Insight → Insights) a la derecha + debajo, un único masonry sembrado de
 * forma asimétrica (useRecommendationMasonry) — no dos retículas separadas.
 *
 * Ni tool ni insight tienen portada propia (§2.40): la ficha pinta el medio
 * del pin del que llega el visitante (`cover`, `?pin=`, solo tools). Sin pin
 * no hay medio y se usa el ratio por defecto.
 *
 * Insight ya no pasa por aquí (su URL redirige al paquete) y `other` dejará
 * de usarla (su página satélite abre directamente el paquete HTML, fase 4).
 * El evento "Tool Open" (§18.2) se dispara solo para tools.
 */
export function ToolInsightDetail({
  content,
  ctaLabel,
  appHref,
  cover,
}: {
  content: PublicContent
  ctaLabel?: string
  appHref?: string
  // Medio, ratio y alt del pin del que llega la ficha (`?pin=`, solo tools).
  // El alt solo lo usa el vídeo (alt obligatorio); la imagen conserva su alt
  // de siempre.
  cover?: PublicPinCover | null
}) {
  const coverMedia = cover?.media ?? null
  // Ratio compartido con el calentamiento de vídeo (fase 2): ver
  // modules/media/domain/detailVideoRatio.ts. Sin pin se usa el caso
  // «vertical» más conservador.
  const ratio = toolInsightDetailRatio(cover?.ratio)
  const recommendations = useRecommendationMasonry(content.id, ratio, {
    textColumn: true,
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
                alt={cover?.alt}
                ratio={ratio}
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
              <CtaLink href={appHref} className={styles.cta}>
                {ctaLabel}
              </CtaLink>
            )}
          </div>
        </div>
      </RecommendationsGrid>
    </article>
  )
}

'use client'

import type { ReactNode } from 'react'
import { PinCard } from '@/components/pin/PinCard'
import { recommendationsCopy } from '@/components/detail/copy'
import type { RecommendationsState } from '@/components/detail/useRecommendationMasonry'
import styles from './RecommendationsGrid.module.css'

/**
 * Lienzo de recomendaciones de las páginas de detalle (tool, insight,
 * other, caso y episodio): pines posicionados, sentinel de paginación y
 * estados de carga/vacío/error. El estado viene de
 * useRecommendationMasonry, que llama el detalle porque necesita su
 * geometría (bloque de contenido) antes de pintar.
 *
 * `children` se pinta DENTRO del lienzo: lo usa el tipo A (tool/insight),
 * cuyo bloque de contenido va en absoluto sobre el masonry. El tipo B
 * (caso/episodio) lo pinta antes, en flujo, y no pasa children.
 */
export function RecommendationsGrid({
  recommendations,
  children,
}: {
  recommendations: RecommendationsState
  children?: ReactNode
}) {
  const {
    containerRef,
    totalHeight,
    positioned,
    isLoading,
    itemCount,
    hasMore,
    error,
    sentinelRef,
  } = recommendations

  return (
    <>
      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ height: totalHeight || undefined }}
      >
        {children}

        {positioned.map((p) => (
          <PinCard
            key={p.key}
            pin={p.item}
            instanceId={p.key}
            style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
            analyticsContext={{
              section: 'recommendations',
              destinationType: p.item.kind,
            }}
          />
        ))}
      </div>

      <div ref={sentinelRef} className={styles.sentinel} />

      {error && <p className={styles.status}>{error}</p>}
      {isLoading && itemCount === 0 && (
        <p className={styles.status}>{recommendationsCopy.loading}</p>
      )}
      {!isLoading && itemCount === 0 && !hasMore && (
        <p className={styles.status}>{recommendationsCopy.empty}</p>
      )}
    </>
  )
}

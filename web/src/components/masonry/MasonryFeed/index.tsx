'use client'

import { PinCard } from '@/components/pin/PinCard'
import { useMasonryFeed } from './useMasonryFeed'
import styles from './MasonryFeed.module.css'

/**
 * Prototipo de Fase 1 (Anexo E.1): retícula masonry con scroll continuo
 * sobre el motor de feed real y el dataset de demostración (50 casos + 9
 * episodios). Objetivo: validar fps, virtualización y ausencia de CLS
 * antes de construir el ABM encima (arquitectura §22).
 */
export function MasonryFeed() {
  const { containerRef, positioned, totalHeight, isLoading, itemCount } =
    useMasonryFeed()

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.container}
        style={{ height: totalHeight }}
      >
        {positioned.map((p) =>
          p.mounted ? (
            <PinCard
              key={p.key}
              pin={p.item}
              instanceId={p.key}
              style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
            />
          ) : (
            // Espaciador: conserva la posición de scroll sin mantener la
            // imagen en el DOM (arquitectura §10.2).
            <div
              key={p.key}
              className={styles.spacer}
              style={{
                transform: `translate(${p.x}px, ${p.y}px)`,
                width: p.width,
                height: p.height,
              }}
            />
          ),
        )}
      </div>
      <div id="greener-feed-sentinel" className={styles.sentinel} />
      {isLoading && <p className={styles.status}>Cargando más pines…</p>}
      <p className={styles.status}>{itemCount} pines cargados</p>
    </div>
  )
}

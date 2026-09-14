'use client'

import { PinCard } from '@/components/pin/PinCard'
import { useHomeFeed } from './useHomeFeed'
import styles from './HomeFeed.module.css'

/**
 * Retícula masonry de la home sobre el feed real (§6-§10 de la
 * arquitectura). A diferencia de MasonryFeed (el prototipo de demo,
 * /preview/masonry), habla con /api/feed/sessions + /api/feed/[sessionId]
 * de verdad — mismo posicionamiento y virtualización, vía
 * useMasonryPositions, que es lo único que comparten los dos.
 */
export function HomeFeed() {
  const { containerRef, positioned, totalHeight, isLoading, itemCount, error } =
    useHomeFeed()

  if (error) {
    return (
      <p className={styles.status}>
        No se ha podido cargar el feed. Recarga la página.
      </p>
    )
  }

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
              key={p.item.pinId}
              pin={p.item}
              style={{ x: p.x, y: p.y, width: p.width, height: p.height }}
            />
          ) : (
            // Espaciador: conserva la posición de scroll sin mantener la
            // imagen en el DOM (arquitectura §10.2).
            <div
              key={p.item.pinId}
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
      <div id="greener-home-feed-sentinel" className={styles.sentinel} />
      {isLoading && itemCount === 0 && (
        <p className={styles.status}>Cargando…</p>
      )}
    </div>
  )
}

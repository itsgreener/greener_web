'use client'

import type { PinRatioValue } from '@/modules/media/domain/closestRatio'
import { useToolCoverVideo } from './useToolCoverVideo'
import styles from './ToolCoverVideo.module.css'

/**
 * Vídeo de demostración que ocupa el hueco de la portada en la ficha de una
 * tool (`/tools/{slug}?pin=...`), con la misma caja que tendría la imagen.
 * Mudo y en bucle; botón de pausa siempre visible. Con
 * `prefers-reduced-motion` o `save-data` no arranca solo: poster + «Play».
 * Sin analítica (decisión del 5 oct 2026).
 *
 * El póster cubre el vídeo hasta que éste está reproduciendo; si no llega a
 * hacerlo en ~10 s, se queda el póster con el botón de reproducir (contrato
 * de medios, fase 1).
 */
export function ToolCoverVideo({
  publicId,
  alt,
  ratio,
  boxWidthPx,
  boxHeightPx,
}: {
  publicId: string
  alt: string
  ratio: PinRatioValue
  boxWidthPx: number
  boxHeightPx: number
}) {
  const {
    videoRef,
    wrapperRef,
    sources,
    poster,
    videoKey,
    posterHidden,
    autoplayAllowed,
    isPlaying,
    toggle,
    onPlay,
    onPause,
    handlers,
  } = useToolCoverVideo({ publicId, ratio, boxWidthPx, boxHeightPx })

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <video
        key={videoKey}
        ref={videoRef}
        poster={poster}
        muted
        loop
        playsInline
        preload={autoplayAllowed ? 'auto' : 'none'}
        aria-label={alt}
        className={styles.video}
        onPlay={onPlay}
        onPause={onPause}
        onCanPlay={handlers.onCanPlay}
        onPlaying={handlers.onPlaying}
        onError={handlers.onVideoError}
      >
        {sources.map((source, index) => (
          <source
            key={source.type}
            src={source.src}
            type={source.type}
            onError={() => handlers.onSourceError(index)}
          />
        ))}
      </video>

      {/* Mismo póster que el atributo `poster` (ya en caché): el navegador
          lo retira en cuanto pinta un fotograma, aunque el vídeo aún no
          avance; esta capa lo mantiene hasta `playing`. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className={`${styles.poster} ${posterHidden ? styles.posterHidden : ''}`}
      />

      <button
        type="button"
        className={styles.toggle}
        onClick={toggle}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  )
}

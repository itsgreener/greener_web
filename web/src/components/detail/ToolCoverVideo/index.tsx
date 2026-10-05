'use client'

import { useToolCoverVideo } from './useToolCoverVideo'
import styles from './ToolCoverVideo.module.css'

/**
 * Vídeo de demostración que ocupa el hueco de la portada en la ficha de una
 * tool (`/tools/{slug}?pin=...`), con la misma caja que tendría la imagen.
 * Mudo y en bucle; botón de pausa siempre visible. Con
 * `prefers-reduced-motion` o `save-data` no arranca solo: poster + «Play».
 * Sin analítica (decisión del 5 oct 2026).
 */
export function ToolCoverVideo({
  publicId,
  alt,
  boxWidthPx,
}: {
  publicId: string
  alt: string
  boxWidthPx: number
}) {
  const {
    videoRef,
    wrapperRef,
    src,
    poster,
    autoplayAllowed,
    isPlaying,
    toggle,
    onPlay,
    onPause,
  } = useToolCoverVideo({ publicId, boxWidthPx })

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload={autoplayAllowed ? 'auto' : 'none'}
        aria-label={alt}
        className={styles.video}
        onPlay={onPlay}
        onPause={onPause}
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

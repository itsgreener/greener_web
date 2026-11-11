import type { CSSProperties, RefObject } from 'react'

import { CtaLabel } from '@/components/cta/Cta'
import { CloudinaryImage } from '@/components/media/CloudinaryImage'
import { cx } from '@/lib/cx'
import { pickFeedImageWidth } from '@/modules/media/domain/mediaDelivery'
import { cssAspectRatio } from '@/modules/shared/domain/ratio'

import type { usePinVideo } from '@/components/pin/usePinVideo'
import type { PinMediaData } from './types'
import styles from './PinCard.module.css'

type VideoState = ReturnType<typeof usePinVideo>

type PinMediaLayersProps = {
  pinId: string
  alt: string
  media: PinMediaData
  /** Ancho de la tarjeta en px: decide el escalón de imagen. */
  width: number
  video: VideoState
  videoRef: RefObject<HTMLVideoElement | null>
  sources: { type: string; src: string }[]
  /** `eager` en las diapositivas que están a punto de verse (carrusel). */
  loading?: 'lazy' | 'eager'
}

/**
 * Las capas de un medio: el póster (o la imagen) es SIEMPRE la capa de base; el
 * `<video>` solo la tapa cuando ya está listo y reproduciendo. La URL ya viene
 * transformada (calidad, ancho de la escalera) por
 * modules/media/client/cloudinaryUrl.ts; next/image la retransformaría de nuevo
 * sin necesidad (arquitectura §9.2). Las usa la tarjeta de un pin y cada
 * diapositiva de un carrusel de pines.
 */
export function PinMediaLayers({
  pinId,
  alt,
  media,
  width,
  video,
  videoRef,
  sources,
  loading = 'lazy',
}: PinMediaLayersProps) {
  // `srcWidth` de reserva = un escalón de la escalera del feed (320/480/640),
  // NO el ancho exacto de la tarjeta: un ancho suelto (`w_189`) crearía una
  // versión única en Cloudinary por cada ancho de columna. El navegador elige
  // del `srcset`.
  const fallbackWidth = pickFeedImageWidth(width)

  return (
    <>
      <CloudinaryImage
        publicId={media.cloudinaryPublicId}
        kind={media.kind}
        profile="feed"
        srcWidth={fallbackWidth}
        sizes={`${Math.round(width)}px`}
        alt={alt}
        loading={loading}
        decoding="async"
        className={styles.image}
      />
      {video.mounted && (
        <video
          key={`${pinId}-${video.attempt}`}
          ref={videoRef}
          className={cx(styles.video, video.visible && styles.videoVisible)}
          muted
          loop
          playsInline
          preload="auto"
          // El póster de debajo ya lleva el `alt`.
          aria-hidden="true"
          onCanPlay={video.handlers.onCanPlay}
          onPlaying={video.handlers.onPlaying}
          onPause={video.handlers.onPause}
          onError={video.handlers.onVideoError}
        >
          {sources.map((source, sourceIndex) => (
            <source
              key={source.type}
              src={source.src}
              type={source.type}
              onError={() => video.handlers.onSourceError(sourceIndex)}
            />
          ))}
        </video>
      )}
    </>
  )
}

/** Zona de medio de la tarjeta de un pin: las capas del medio más el CTA. */
export function PinCardMedia({
  ratio,
  cta,
  ctaLanguage,
  ...layers
}: PinMediaLayersProps & {
  ratio: string
  cta: string | null
  // Idioma del CTA si es texto de contenido (página satélite); si no, ausente.
  ctaLanguage?: string | null
}) {
  return (
    <div
      className={styles.media}
      style={{ '--ratio': cssAspectRatio(ratio) } as CSSProperties}
    >
      <PinMediaLayers {...layers} />
      {cta && (
        <CtaLabel className={styles.cta} lang={ctaLanguage ?? undefined}>
          {cta}
        </CtaLabel>
      )}
    </div>
  )
}

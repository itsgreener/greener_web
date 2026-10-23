import type { CSSProperties, RefObject } from 'react'

import {
  buildImageSrcSet,
  buildImageUrl,
  buildVideoPosterSrcSet,
  buildVideoPosterUrl,
} from '@/modules/media/client/cloudinaryUrl'
import { CtaLabel } from '@/components/cta/Cta'
import { pickFeedImageWidth } from '@/modules/media/domain/mediaDelivery'
import { cssAspectRatio } from '@/modules/shared/domain/ratio'

import type { PinMediaData } from './types'
import type { usePinVideo } from '@/components/pin/usePinVideo'
import styles from './PinCard.module.css'

type VideoState = ReturnType<typeof usePinVideo>

/**
 * Zona de medio de la tarjeta: el póster (o la imagen) es SIEMPRE la capa de
 * base; el `<video>` solo la tapa cuando ya está listo y reproduciendo. La
 * URL ya viene transformada (calidad, ancho de la escalera) por
 * modules/media/client/cloudinaryUrl.ts; next/image la retransformaría de
 * nuevo sin necesidad (arquitectura §9.2).
 */
export function PinCardMedia({
  pinId,
  ratio,
  alt,
  cta,
  media,
  width,
  video,
  videoRef,
  sources,
}: {
  pinId: string
  ratio: string
  alt: string
  cta: string | null
  media: PinMediaData
  /** Ancho de la tarjeta en px: decide el escalón de imagen. */
  width: number
  video: VideoState
  videoRef: RefObject<HTMLVideoElement | null>
  sources: { type: string; src: string }[]
}) {
  const isVideo = media.kind === 'video'

  // `src` de reserva = un escalón de la escalera del feed (320/480/640), NO
  // el ancho exacto de la tarjeta: un ancho suelto (`w_189`) crearía una
  // versión única en Cloudinary por cada ancho de columna. El navegador
  // elige del `srcset`.
  const fallbackWidth = pickFeedImageWidth(width)
  const imageUrl = isVideo
    ? buildVideoPosterUrl(
        media.cloudinaryPublicId,
        { width: fallbackWidth },
        'feed',
      )
    : buildImageUrl(media.cloudinaryPublicId, 'feed', fallbackWidth)

  return (
    <div
      className={styles.media}
      style={{ '--ratio': cssAspectRatio(ratio) } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        srcSet={
          isVideo
            ? buildVideoPosterSrcSet(media.cloudinaryPublicId)
            : buildImageSrcSet(media.cloudinaryPublicId, 'feed')
        }
        sizes={`${Math.round(width)}px`}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={styles.image}
      />
      {video.mounted && (
        <video
          key={`${pinId}-${video.attempt}`}
          ref={videoRef}
          className={`${styles.video} ${video.visible ? styles.videoVisible : ''}`}
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
      {cta && <CtaLabel className={styles.cta}>{cta}</CtaLabel>}
    </div>
  )
}

import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import styles from './PinCard.module.css'

export interface PinCardMedia {
  kind: 'image' | 'video'
  cloudinaryPublicId: string
}

export interface PinCardData {
  pinId: string
  destination: string
  ratio: string
  // §3 "Pin (todos los tipos)": opcional en caso/episodio, no se muestra.
  label: string | null
  cta: string | null
  alt: string
  // Hasta 8 medios cuando el pin se agrupa como carrusel
  // (show_as_carousel), pero la tarjeta de esta primera versión solo
  // pinta el primero — el carrusel dentro de la tarjeta queda para más
  // adelante, a propósito (no es una limitación del backend).
  media: PinCardMedia[]
}

export interface PinCardStyle {
  x: number
  y: number
  width: number
  height: number
}

/** Convierte el ratio cerrado del pin (brief §3) a aspect-ratio CSS. */
function aspectRatioCss(ratio: string): string {
  const [w, h] = ratio.split(':').map(Number)
  return `${w} / ${h}`
}

/**
 * Tarjeta de pin: imagen optimizada para feed (nunca el original — política
 * de medios §3), espacio reservado antes de la descarga (evita CLS, §9.2,
 * §10.1) y posicionada por transform, no por flujo normal del documento.
 *
 * Un pin de vídeo se muestra siempre como poster estático — sin autoplay
 * ni reproducción en la propia tarjeta en esta primera versión (§9.3
 * queda para cuando se aborde de verdad el presupuesto de vídeos
 * simultáneos en el feed).
 */
export function PinCard({
  pin,
  style,
}: {
  pin: PinCardData
  style: PinCardStyle
}) {
  const primaryMedia = pin.media[0]
  if (!primaryMedia) return null

  const imageUrl =
    primaryMedia.kind === 'video'
      ? buildVideoPosterUrl(primaryMedia.cloudinaryPublicId)
      : buildImageUrl(
          primaryMedia.cloudinaryPublicId,
          'feed',
          Math.round(style.width),
        )

  return (
    <a
      href={pin.destination}
      className={styles.card}
      style={{
        transform: `translate(${style.x}px, ${style.y}px)`,
        width: style.width,
      }}
    >
      <div
        className={styles.media}
        style={{ aspectRatio: aspectRatioCss(pin.ratio) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- la URL ya viene
            transformada (q_auto/f_auto/ancho) por modules/media/infrastructure/cloudinaryUrl.ts;
            next/image la retransformaría de nuevo sin necesidad (arquitectura §9.2). */}
        <img
          src={imageUrl}
          srcSet={
            primaryMedia.kind === 'image'
              ? buildImageSrcSet(primaryMedia.cloudinaryPublicId, 'feed')
              : undefined
          }
          sizes={
            primaryMedia.kind === 'image'
              ? `${Math.round(style.width)}px`
              : undefined
          }
          alt={pin.alt}
          loading="lazy"
          decoding="async"
          className={styles.image}
        />
        {pin.cta && <span className={styles.cta}>{pin.cta}</span>}
      </div>
      {pin.label && <p className={styles.label}>{pin.label}</p>}
    </a>
  )
}

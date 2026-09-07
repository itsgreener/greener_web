import {
  buildImageUrl,
  buildImageSrcSet,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import styles from './PinCard.module.css'

export interface PinCardData {
  pinId: string
  destination: string
  ratio: string
  label: string
  cta: string | null
  alt: string
  cloudinaryPublicId: string
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
 */
export function PinCard({
  pin,
  style,
}: {
  pin: PinCardData
  style: PinCardStyle
}) {
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
          src={buildImageUrl(
            pin.cloudinaryPublicId,
            'feed',
            Math.round(style.width),
          )}
          srcSet={buildImageSrcSet(pin.cloudinaryPublicId, 'feed')}
          sizes={`${Math.round(style.width)}px`}
          alt={pin.alt}
          loading="lazy"
          decoding="async"
          className={styles.image}
        />
        {pin.cta && <span className={styles.cta}>{pin.cta}</span>}
      </div>
      <p className={styles.label}>{pin.label}</p>
    </a>
  )
}

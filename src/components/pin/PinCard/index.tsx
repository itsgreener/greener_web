'use client'

import { useRef } from 'react'
import { useHoverIntent } from '@/components/pin/useHoverIntent'
import { CardLink } from './CardLink'
import { PinCardLabel } from './PinCardLabel'
import { PinCardMedia } from './PinCardMedia'
import { PinCarouselCard } from './PinCarouselCard'
import { trackPinClick } from './pinClick'
import { usePinPlayback } from './usePinPlayback'
import { cardPositionStyle, type PinCardProps } from './types'
import styles from './PinCard.module.css'

export { cardPositionStyle } from './types'
export type {
  PinAnalyticsContext,
  PinCardData,
  PinCardProps,
  PinCardStyle,
  PinMediaData,
} from './types'

/**
 * Tarjeta de pin: imagen optimizada para feed (nunca el original — política
 * de medios §3), espacio reservado antes de la descarga (evita CLS, §9.2,
 * §10.1) y posicionada por transform, no por flujo normal del documento.
 *
 * Reproducción de vídeo, según `pin.autoplayMode` (§9.1, ABM) —
 * 'viewport' compite por uno de los
 * huecos globales del feed (2 escritorio / 1 móvil, §9.3, ver
 * videoPlaybackCoordinator.ts); 'hover' reproduce solo mientras el
 * puntero lleva ~200 ms encima (intención de hover: cruzar el pin de pasada
 * no descarga nada; el foco de teclado es inmediato), sin competir por ningún
 * hueco; `null` nunca reproduce — poster estático siempre.
 *
 * Carga del vídeo (contrato de medios, fase 1): el póster es
 * SIEMPRE la capa de base y el `<video>` se monta oculto encima cuando la
 * tarjeta está cerca del viewport (prefetch, con un tope global de billetes;
 * ver usePinVideo.ts), y solo se hace visible cuando ya está listo y
 * reproduciendo. Con `prefers-reduced-motion`, `save-data`, 2G o una
 * conexión lenta el feed no hace prefetch, ni autoplay, ni vídeo en hover:
 * póster fijo. Un pin `hover` no hace prefetch (el vídeo se pide con la
 * intención de hover).
 */
export function PinCard(props: PinCardProps) {
  // Un episodio con «formar un carrusel con los pines» llega como UNA tarjeta
  // con varias diapositivas (§2.150); todo lo demás, un único medio.
  return props.pin.media.length > 1 ? (
    <PinCarouselCard {...props} />
  ) : (
    <SinglePinCard {...props} />
  )
}

function SinglePinCard({
  pin,
  style,
  analyticsContext,
  instanceId,
}: PinCardProps) {
  const videoId = instanceId ?? pin.pinId
  const media = pin.media

  const { active: hovering, handlers: hoverHandlers } = useHoverIntent()
  const cardRef = useRef<HTMLAnchorElement | null>(null)

  const current = media[0]

  const { video, videoRef, sources } = usePinPlayback({
    videoId,
    cardRef,
    media: current,
    autoplayMode: pin.autoplayMode,
    hovering,
  })

  if (!current) return null

  function handlePinClick() {
    trackPinClick(pin.destination, analyticsContext, current)
  }

  // Las Tools conservan una única ficha aunque tengan muchos pines. El
  // servidor ya añade ?pin=<pinId> al destino, y la ficha usa el medio de
  // ese pin como miniatura.
  const destination = pin.destination

  return (
    <CardLink
      cardRef={cardRef}
      href={destination}
      className={styles.card}
      style={cardPositionStyle(style)}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      onFocus={hoverHandlers.onFocus}
      onBlur={hoverHandlers.onBlur}
      onClick={handlePinClick}
    >
      <PinCardMedia
        pinId={pin.pinId}
        ratio={pin.ratio}
        alt={pin.alt}
        cta={pin.cta}
        ctaLanguage={pin.languages?.cta}
        media={current}
        width={style.width}
        video={video}
        videoRef={videoRef}
        sources={sources}
      />
      <PinCardLabel
        displayTitle={pin.displayTitle}
        displaySecondary={pin.displaySecondary}
        label={pin.label}
        languages={pin.languages}
      />
    </CardLink>
  )
}

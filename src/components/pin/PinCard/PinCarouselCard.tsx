'use client'

import { useRef, type CSSProperties } from 'react'

import { CtaLabel } from '@/components/cta/Cta'
import { useSlidePaging } from '@/components/detail/CaseDetail/useSlidePaging'
import { useHoverIntent } from '@/components/pin/useHoverIntent'
import { useMotionPreferences } from '@/lib/useMotionPreferences'
import { carouselSlideMs } from '@/modules/feed/domain/carouselTiming'
import { cssAspectRatio } from '@/modules/shared/domain/ratio'

import { CardLink } from './CardLink'
import { PinCardLabel } from './PinCardLabel'
import { PinMediaLayers } from './PinCardMedia'
import { trackPinClick } from './pinClick'
import {
  cardPositionStyle,
  type PinCardData,
  type PinCardProps,
  type PinMediaData,
} from './types'
import { useCarouselAutoplay } from './useCarouselAutoplay'
import { usePinPlayback } from './usePinPlayback'
import styles from './PinCard.module.css'

/**
 * Tarjeta de un carrusel de pines de episodio (§2.150): UNA tarjeta del feed
 * con varias diapositivas del mismo ratio. Es una unidad más del masonry (misma
 * posición, mismo enlace al episodio, mismo pie), solo que el medio cambia:
 *
 * - avanza sola (`useCarouselAutoplay`) y se desliza con el dedo o el
 *   trackpad (scroll nativo con `scroll-snap`, `useSlidePaging`); no hay
 *   puntos ni flechas;
 * - solo se piden las diapositivas cercanas a la visible (la anterior, la
 *   activa y la siguiente): en Cloudinary Free cada imagen cuenta;
 * - solo la diapositiva visible puede reproducir vídeo y competir por un hueco
 *   global; el resto no monta ningún `<video>`.
 */
export function PinCarouselCard({
  pin,
  style,
  analyticsContext,
  instanceId,
}: PinCardProps) {
  const videoId = instanceId ?? pin.pinId
  const slides = pin.media

  const { active: hovering, handlers: hoverHandlers } = useHoverIntent()
  const cardRef = useRef<HTMLAnchorElement | null>(null)
  const { feedAutoplayAllowed } = useMotionPreferences()
  const { trackRef, active, goTo } = useSlidePaging(slides.length)

  const visibleSlide = slides[active] ?? slides[0]

  useCarouselAutoplay({
    cardRef,
    count: slides.length,
    active,
    goTo,
    slideMs: carouselSlideMs(visibleSlide),
    // Con reduced-motion, save-data o conexión lenta no se mueve sola: se
    // queda en la primera y el visitante pasa las diapositivas si quiere.
    enabled: feedAutoplayAllowed,
    paused: hovering,
    staggerKey: videoId,
  })

  return (
    <CardLink
      cardRef={cardRef}
      href={pin.destination}
      className={styles.card}
      style={cardPositionStyle(style)}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      onFocus={hoverHandlers.onFocus}
      onBlur={hoverHandlers.onBlur}
      onClick={() =>
        trackPinClick(pin.destination, analyticsContext, visibleSlide)
      }
    >
      <div
        className={styles.media}
        style={{ '--ratio': cssAspectRatio(pin.ratio) } as CSSProperties}
      >
        <div ref={trackRef} className={styles.track}>
          {slides.map((slide, index) => (
            <CarouselSlide
              key={`${slide.cloudinaryPublicId}-${index}`}
              pin={pin}
              slide={slide}
              videoId={`${videoId}:${index}`}
              cardRef={cardRef}
              isActive={index === active}
              isNear={isNear(index, active, slides.length)}
              hovering={hovering}
              width={style.width}
            />
          ))}
        </div>

        {pin.cta && (
          <CtaLabel
            className={styles.cta}
            lang={pin.languages?.cta ?? undefined}
          >
            {pin.cta}
          </CtaLabel>
        )}
      </div>

      <PinCardLabel
        displayTitle={pin.displayTitle}
        displaySecondary={pin.displaySecondary}
        label={pin.label}
        languages={pin.languages}
      />
    </CardLink>
  )
}

/** La diapositiva anterior, la activa y la siguiente (el carrusel da la vuelta). */
function isNear(index: number, active: number, count: number): boolean {
  const distance = Math.abs(index - active)

  return Math.min(distance, count - distance) <= 1
}

function CarouselSlide({
  pin,
  slide,
  videoId,
  cardRef,
  isActive,
  isNear,
  hovering,
  width,
}: {
  pin: PinCardData
  slide: PinMediaData
  videoId: string
  cardRef: React.RefObject<HTMLAnchorElement | null>
  isActive: boolean
  isNear: boolean
  hovering: boolean
  width: number
}) {
  const { video, videoRef, sources } = usePinPlayback({
    videoId,
    cardRef,
    media: slide,
    // Cada diapositiva es un pin con su propio modo de autoplay.
    autoplayMode:
      slide.autoplayMode !== undefined ? slide.autoplayMode : pin.autoplayMode,
    hovering,
    enabled: isActive,
  })

  return (
    // Las diapositivas que no se ven no se leen: solo la activa tiene `alt`
    // accesible, como en un carrusel con una única diapositiva a la vista.
    <div className={styles.slide} aria-hidden={isActive ? undefined : true}>
      {isNear && (
        <PinMediaLayers
          pinId={videoId}
          alt={slide.alt ?? pin.alt}
          media={slide}
          width={width}
          video={video}
          videoRef={videoRef}
          sources={sources}
          loading={isActive ? 'eager' : 'lazy'}
        />
      )}
    </div>
  )
}

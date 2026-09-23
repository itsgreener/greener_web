'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoFullUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'

import {
  trackAnalyticsEvent,
} from '@/modules/analytics/analytics'

import { useVideoSlot } from '../useVideoSlot'
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

  // Solo tiene efecto en un pin de un único medio de vídeo.
  autoplayMode:
    | 'viewport'
    | 'hover'
    | null

  // Hasta 8 medios cuando el pin se agrupa como carrusel.
  media: PinCardMedia[]
}

export interface PinCardStyle {
  x: number
  y: number
  width: number
  height: number
}

export interface PinAnalyticsContext {
  /**
   * Sección desde la que se pulsa:
   * home / work / tools / insights / channel / recommendations.
   */
  section: string

  /**
   * Tipo de contenido de destino.
   *
   * Hoy procede de FeedBatchItem.kind.
   */
  destinationType: string

  /**
   * La arquitectura contempla tag, pero el feed todavía no lo entrega.
   */
  tag?: string
}

// Confirmado el 15 sep: 5 s por slide, sin controles manuales.
const SLIDE_INTERVAL_MS =
  5000

/** Convierte el ratio cerrado del pin a aspect-ratio CSS. */
function aspectRatioCss(
  ratio: string,
): string {
  const [w, h] =
    ratio
      .split(':')
      .map(Number)

  return `${w} / ${h}`
}

function analyticsPinType(
  media: PinCardMedia[],
): 'image' | 'video' | 'carousel' {
  if (media.length > 1) {
    return 'carousel'
  }

  if (
    media[0]?.kind ===
    'video'
  ) {
    return 'video'
  }

  return 'image'
}

/**
 * Tarjeta de pin: imagen optimizada para feed, espacio reservado antes
 * de descarga y posicionada mediante transform.
 */
export function PinCard({
  pin,
  style,
  analyticsContext,
}: {
  pin: PinCardData
  style: PinCardStyle
  analyticsContext?: PinAnalyticsContext
}) {
  const media = pin.media
  const isCarousel =
    media.length > 1

  const [index, setIndex] =
    useState(0)

  const [
    hovering,
    setHovering,
  ] = useState(false)

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    )

  const cardRef =
    useRef<HTMLAnchorElement | null>(
      null,
    )

  const current =
    media[index]

  const isVideoSlide =
    current?.kind ===
    'video'

  const wantsGlobalSlot =
    isVideoSlide &&
    (isCarousel ||
      pin.autoplayMode ===
        'viewport')

  const hasSlot =
    useVideoSlot(
      pin.pinId,
      cardRef,
      wantsGlobalSlot,
    )

  const isPlaying =
    isVideoSlide &&
    (isCarousel
      ? hasSlot
      : pin.autoplayMode ===
          'viewport'
        ? hasSlot
        : pin.autoplayMode ===
            'hover'
          ? hovering
          : false)

  const advance =
    useCallback(() => {
      setIndex(
        (i) =>
          (i + 1) %
          media.length,
      )
    }, [media.length])

  useEffect(() => {
    if (
      !isCarousel ||
      hovering
    ) {
      return
    }

    if (
      isVideoSlide &&
      isPlaying
    ) {
      return
    }

    const id =
      setTimeout(
        advance,
        SLIDE_INTERVAL_MS,
      )

    return () =>
      clearTimeout(id)
  }, [
    isCarousel,
    hovering,
    index,
    isVideoSlide,
    isPlaying,
    advance,
  ])

  useEffect(() => {
    if (!isCarousel) {
      return
    }

    const el =
      videoRef.current

    if (el) {
      el.loop =
        hovering
    }
  }, [
    isCarousel,
    hovering,
    index,
  ])

  useEffect(() => {
    const el =
      videoRef.current

    if (
      !el ||
      !isPlaying
    ) {
      return
    }

    el.currentTime = 0

    try {
      el
        .play()
        ?.catch(() => {})
    } catch {
      // jsdom o navegador sin autoplay: permanece el poster.
    }
  }, [
    index,
    isPlaying,
  ])

  if (!current) {
    return null
  }

  function handleVideoEnded() {
    if (
      isCarousel &&
      !hovering
    ) {
      advance()
    }
  }

  function handlePinClick() {
    if (!analyticsContext) {
      return
    }

    trackAnalyticsEvent(
      'Pin Click',
      {
        destinationType:
          analyticsContext.destinationType,

        section:
          analyticsContext.section,

        ...(analyticsContext.tag
          ? {
              tag:
                analyticsContext.tag,
            }
          : {}),

        pinType:
          analyticsPinType(
            media,
          ),
      },
      {
        interactive:
          true,
      },
    )
  }

  const imageUrl =
    isVideoSlide
      ? buildVideoPosterUrl(
          current.cloudinaryPublicId,
        )
      : buildImageUrl(
          current.cloudinaryPublicId,
          'feed',
          Math.round(
            style.width,
          ),
        )

  return (
    <a
      ref={cardRef}
      href={pin.destination}
      className={
        styles.card
      }
      style={{
        transform:
          `translate(${style.x}px, ${style.y}px)`,

        width:
          style.width,
      }}
      onClick={
        handlePinClick
      }
      onMouseEnter={() =>
        setHovering(true)
      }
      onMouseLeave={() =>
        setHovering(false)
      }
      onFocus={() =>
        setHovering(true)
      }
      onBlur={() =>
        setHovering(false)
      }
    >
      <div
        className={
          styles.media
        }
        style={{
          aspectRatio:
            aspectRatioCss(
              pin.ratio,
            ),
        }}
      >
        {isPlaying ? (
          <video
            key={`${pin.pinId}-${index}`}
            ref={videoRef}
            src={buildVideoFullUrl(
              current.cloudinaryPublicId,
            )}
            poster={buildVideoPosterUrl(
              current.cloudinaryPublicId,
            )}
            muted
            autoPlay
            loop={!isCarousel}
            playsInline
            onEnded={
              handleVideoEnded
            }
            aria-label={
              pin.alt
            }
            className={
              styles.image
            }
          />
        ) : (
          // URL transformada por Cloudinary.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              imageUrl
            }
            srcSet={
              current.kind ===
              'image'
                ? buildImageSrcSet(
                    current.cloudinaryPublicId,
                    'feed',
                  )
                : undefined
            }
            sizes={
              current.kind ===
              'image'
                ? `${Math.round(style.width)}px`
                : undefined
            }
            alt={
              pin.alt
            }
            loading="lazy"
            decoding="async"
            className={
              styles.image
            }
          />
        )}

        {pin.cta && (
          <span
            className={
              styles.cta
            }
          >
            {pin.cta}
          </span>
        )}
      </div>

      {pin.label && (
        <p
          className={
            styles.label
          }
        >
          {pin.label}
        </p>
      )}
    </a>
  )
}
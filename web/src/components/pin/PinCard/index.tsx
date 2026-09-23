'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildImageUrl,
  buildImageSrcSet,
  buildVideoFullUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
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
  // Solo tiene efecto en un pin de un único medio de vídeo — ver más
  // abajo. El slide activo de un carrusel reproduce siempre que tenga
  // hueco, sin mirar este campo (comportamiento ya decidido, distinto).
  autoplayMode: 'viewport' | 'hover' | null
  // Hasta 8 medios cuando el pin se agrupa como carrusel
  // (show_as_carousel) — ver más abajo cómo se recorren.
  media: PinCardMedia[]
}

export interface PinCardStyle {
  x: number
  y: number
  width: number
  height: number
}

// Confirmado el 15 sep: 5 s por slide, sin controles de avance/retroceso
// manual (es una tarjeta pequeña) — con hover, la imagen se congela y el
// vídeo entra en loop; al salir del hover, se reinicia el temporizador.
const SLIDE_INTERVAL_MS = 5000

/**
 * Evento "Pin Click" (arquitectura §18.2). `tag` queda opcional porque
 * el feed actual todavía no transporta etiquetas por pin — se rellenará
 * el día que exista ese dato, sin tener que tocar quien ya llama a esto.
 */
export interface PinAnalyticsContext {
  section: string
  destinationType: string
  tag?: string
}

/** Convierte el ratio cerrado del pin (brief §3) a aspect-ratio CSS. */
function aspectRatioCss(ratio: string): string {
  const [w, h] = ratio.split(':').map(Number)
  return `${w} / ${h}`
}

/**
 * `pinType` del evento "Pin Click" (§18.2) — ya no existe un `pin_type`
 * de base de datos del que leerlo directamente, se deriva del propio
 * array de medios que ya tiene el componente.
 */
function analyticsPinType(
  media: PinCardMedia[],
): 'image' | 'video' | 'carousel' {
  if (media.length > 1) return 'carousel'
  return media[0]?.kind === 'video' ? 'video' : 'image'
}

/**
 * Tarjeta de pin: imagen optimizada para feed (nunca el original — política
 * de medios §3), espacio reservado antes de la descarga (evita CLS, §9.2,
 * §10.1) y posicionada por transform, no por flujo normal del documento.
 *
 * Reproducción de vídeo, dos casos independientes:
 *
 * 1. Un único medio de vídeo (`media.length === 1`): según
 *    `pin.autoplayMode` (§9.1, ABM) — 'viewport' compite por uno de los
 *    huecos globales del feed (2 escritorio / 1 móvil, §9.3, ver
 *    videoPlaybackCoordinator.ts); 'hover' reproduce solo mientras el
 *    puntero está encima, sin competir por ningún hueco (es una acción
 *    explícita del usuario, no reproducción ambiental); `null` nunca
 *    reproduce — poster estático siempre, como hasta ahora.
 *
 * 2. Carrusel (`show_as_carousel`, media.length > 1): el slide activo,
 *    si es vídeo, reproduce siempre que tenga hueco — también compite
 *    por el mismo presupuesto global de 2/1 que los pines de un único
 *    vídeo (confirmado el 15 sep). Si no consigue hueco, se queda en
 *    poster y el carrusel avanza igualmente a los 5 s, como un slide de
 *    imagen — nunca se queda parado esperando un vídeo que no reproduce.
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
  const isCarousel = media.length > 1

  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cardRef = useRef<HTMLAnchorElement | null>(null)

  const current = media[index]
  const isVideoSlide = current?.kind === 'video'

  // El slide activo de un carrusel siempre compite por un hueco global;
  // un pin de un único vídeo solo lo hace en modo 'viewport' — 'hover' no
  // compite (arriba, en el docstring, se explica el porqué).
  const wantsGlobalSlot =
    isVideoSlide && (isCarousel || pin.autoplayMode === 'viewport')
  const hasSlot = useVideoSlot(pin.pinId, cardRef, wantsGlobalSlot)

  const isPlaying =
    isVideoSlide &&
    (isCarousel
      ? hasSlot
      : pin.autoplayMode === 'viewport'
        ? hasSlot
        : pin.autoplayMode === 'hover'
          ? hovering
          : false)

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % media.length)
  }, [media.length])

  // Temporizador de 5 s — para slides de imagen, y también para un slide
  // de vídeo que no ha conseguido hueco (no hay 'ended' que lo avance).
  useEffect(() => {
    if (!isCarousel || hovering) return
    if (isVideoSlide && isPlaying) return // avanza por 'ended', más abajo
    const id = setTimeout(advance, SLIDE_INTERVAL_MS)
    return () => clearTimeout(id)
  }, [isCarousel, hovering, index, isVideoSlide, isPlaying, advance])

  // Hover sobre un slide de vídeo de carrusel: que entre en loop en vez
  // de avanzar. Al salir del hover, se quita el loop — el próximo
  // 'ended' natural dispara el avance ("se reinicia el temporizador").
  // No aplica al vídeo de un pin sin carrusel: ese usa el atributo loop
  // fijo (ver el <video> más abajo), no necesita este ajuste imperativo.
  useEffect(() => {
    if (!isCarousel) return
    const el = videoRef.current
    if (el) el.loop = hovering
  }, [isCarousel, hovering, index])

  // Arranca el vídeo desde el principio cada vez que pasa a reproducirse
  // (nuevo slide de carrusel, entra en viewport, o empieza el hover).
  useEffect(() => {
    const el = videoRef.current
    if (!el || !isPlaying) return
    el.currentTime = 0
    try {
      // Autoplay bloqueado por el navegador o sin soporte real de vídeo
      // (jsdom en tests): se queda en el poster, no rompe nada — por eso
      // el try/catch además del .catch, play() puede lanzar de forma
      // síncrona en vez de devolver una promesa rechazada según el entorno.
      el.play()?.catch(() => {})
    } catch {
      // ver comentario de arriba
    }
  }, [index, isPlaying])

  if (!current) return null

  function handleVideoEnded() {
    if (isCarousel && !hovering) advance()
  }

  function handlePinClick() {
    if (!analyticsContext) return

    trackAnalyticsEvent(
      'Pin Click',
      {
        destinationType: analyticsContext.destinationType,
        section: analyticsContext.section,
        ...(analyticsContext.tag ? { tag: analyticsContext.tag } : {}),
        pinType: analyticsPinType(media),
      },
      { interactive: true },
    )
  }

  const imageUrl = isVideoSlide
    ? buildVideoPosterUrl(current.cloudinaryPublicId)
    : buildImageUrl(current.cloudinaryPublicId, 'feed', Math.round(style.width))

  return (
    <a
      ref={cardRef}
      href={pin.destination}
      className={styles.card}
      style={{
        transform: `translate(${style.x}px, ${style.y}px)`,
        width: style.width,
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      onClick={handlePinClick}
    >
      <div
        className={styles.media}
        style={{ aspectRatio: aspectRatioCss(pin.ratio) }}
      >
        {isPlaying ? (
          <video
            key={`${pin.pinId}-${index}`}
            ref={videoRef}
            src={buildVideoFullUrl(current.cloudinaryPublicId)}
            poster={buildVideoPosterUrl(current.cloudinaryPublicId)}
            muted
            autoPlay
            loop={!isCarousel}
            playsInline
            onEnded={handleVideoEnded}
            aria-label={pin.alt}
            className={styles.image}
          />
        ) : (
          // La URL ya viene transformada (q_auto/f_auto/ancho) por
          // modules/media/infrastructure/cloudinaryUrl.ts; next/image la
          // retransformaría de nuevo sin necesidad (arquitectura §9.2).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            srcSet={
              current.kind === 'image'
                ? buildImageSrcSet(current.cloudinaryPublicId, 'feed')
                : undefined
            }
            sizes={
              current.kind === 'image'
                ? `${Math.round(style.width)}px`
                : undefined
            }
            alt={pin.alt}
            loading="lazy"
            decoding="async"
            className={styles.image}
          />
        )}
        {pin.cta && <span className={styles.cta}>{pin.cta}</span>}
      </div>
      {pin.label && <p className={styles.label}>{pin.label}</p>}
    </a>
  )
}

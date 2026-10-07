'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildFeedVideoSources,
  buildImageUrl,
  buildImageSrcSet,
  buildVideoPosterSrcSet,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import { pickFeedImageWidth } from '@/modules/media/domain/mediaDelivery'
import { canAnimateInFeed } from '@/modules/media/domain/mediaLimits'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { useMotionPreferences } from '@/lib/useMotionPreferences'
import { useVideoSlot } from '../useVideoSlot'
import { usePinVideo } from '../usePinVideo'
import styles from './PinCard.module.css'

export interface PinCardMedia {
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  // Solo vídeo. Un vídeo más largo que PIN_ANIMATION_LIMITS (p. ej. los de
  // demostración de una tool, hasta 15 s) no se anima en el feed: se queda
  // en su poster. Ausente/null = se desconoce, se anima como siempre.
  durationSeconds?: number | null
}

export interface PinCardData {
  pinId: string
  destination: string
  ratio: string
  // Tool/insight/other: gancho escrito por el admin.
  // Case/episode: siempre llega null; el texto se deriva del contenido.
  label: string | null
  displayTitle?: string | null
  displaySecondary?: string | null
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
 *
 * Carga del vídeo (contrato de medios, fase 1 — 7 oct 2026): el póster es
 * SIEMPRE la capa de base y el `<video>` se monta oculto encima cuando la
 * tarjeta está cerca del viewport (prefetch, con un tope global de billetes;
 * ver usePinVideo.ts), y solo se hace visible cuando ya está listo y
 * reproduciendo. Con `prefers-reduced-motion`, `save-data`, 2G o una
 * conexión lenta el feed no hace prefetch ni autoplay: póster fijo. El
 * hover es una acción explícita del usuario y sigue funcionando.
 */
export function PinCard({
  pin,
  style,
  analyticsContext,
  instanceId,
}: {
  pin: PinCardData
  style: PinCardStyle
  analyticsContext?: PinAnalyticsContext
  /**
   * Identidad de ESTA tarjeta (no la del pin): el mismo pin puede estar
   * montado dos veces a la vez y el coordinador de vídeo indexa por id, así
   * que con `pinId` la segunda tarjeta le pisaba el registro a la primera.
   * Las listas pasan aquí la clave de posición; sin ella se usa el pinId.
   */
  instanceId?: string
}) {
  const videoId = instanceId ?? pin.pinId
  const media = pin.media
  const isCarousel = media.length > 1

  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const cardRef = useRef<HTMLAnchorElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { feedAutoplayAllowed } = useMotionPreferences()

  const current = media[index]
  const isVideoSlide = current?.kind === 'video'

  // Un vídeo largo (> PIN_ANIMATION_LIMITS) sigue siendo un vídeo — se
  // pinta con su poster —, pero NO se anima ni compite por un hueco: solo
  // se reproduce en el detalle. Así el feed nunca descarga uno entero.
  const isAnimatable =
    isVideoSlide && canAnimateInFeed(current?.durationSeconds)

  // El slide activo de un carrusel siempre compite por un hueco global;
  // un pin de un único vídeo solo lo hace en modo 'viewport' — 'hover' no
  // compite (arriba, en el docstring, se explica el porqué). Sin autoplay
  // permitido en el feed (reduced-motion, save-data, conexión lenta) no
  // compite por nada: póster fijo.
  const wantsGlobalSlot =
    isAnimatable &&
    feedAutoplayAllowed &&
    (isCarousel || pin.autoplayMode === 'viewport')
  const hasSlot = useVideoSlot(videoId, cardRef, wantsGlobalSlot)

  const isPlaying =
    isAnimatable &&
    (isCarousel
      ? hasSlot
      : pin.autoplayMode === 'viewport'
        ? hasSlot
        : pin.autoplayMode === 'hover'
          ? hovering
          : false)

  // Fuentes del vídeo del slide activo: dos explícitas (WebM/VP9 y
  // MP4/H.264), a un solo ancho (contrato de medios §4.4-§4.5).
  const sources = useMemo(
    () =>
      isVideoSlide && current
        ? buildFeedVideoSources(current.cloudinaryPublicId)
        : [],
    [isVideoSlide, current],
  )

  // Prefetch, listo-para-reproducir, tiempo máximo y reintentos del vídeo.
  const video = usePinVideo({
    id: videoId,
    cardRef,
    videoRef,
    resetKey: `${index}-${current?.cloudinaryPublicId ?? ''}`,
    sourceCount: sources.length,
    // Solo se hace prefetch de lo que puede llegar a reproducirse: un pin de
    // un único vídeo sin `autoplayMode` nunca se anima y no gasta ancho de
    // banda (en Cloudinary Free cada MB cuenta).
    prefetchEnabled:
      isAnimatable &&
      feedAutoplayAllowed &&
      (isCarousel || pin.autoplayMode !== null),
    wantsPlay: isPlaying,
  })

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % media.length)
  }, [media.length])

  // Temporizador de 5 s — para slides de imagen, y también para un slide
  // de vídeo que todavía no suena (sin hueco, o cargando): nunca se queda
  // parado esperando un vídeo que no reproduce. Cuando el vídeo ya suena,
  // avanza por 'ended' (más abajo).
  useEffect(() => {
    if (!isCarousel || hovering) return
    if (isVideoSlide && video.isActuallyPlaying) return
    const id = setTimeout(advance, SLIDE_INTERVAL_MS)
    return () => clearTimeout(id)
  }, [
    isCarousel,
    hovering,
    index,
    isVideoSlide,
    video.isActuallyPlaying,
    advance,
  ])

  // Hover sobre un slide de vídeo de carrusel: que entre en loop en vez
  // de avanzar. Al salir del hover, se quita el loop — el próximo
  // 'ended' natural dispara el avance ("se reinicia el temporizador").
  // No aplica al vídeo de un pin sin carrusel: ese usa el atributo loop
  // fijo (ver el <video> más abajo), no necesita este ajuste imperativo.
  // Se repite al (re)montarse el vídeo: puede aparecer con el hover ya
  // puesto, o remontarse en un reintento.
  useEffect(() => {
    if (!isCarousel) return
    const el = videoRef.current
    if (el) el.loop = hovering
  }, [isCarousel, hovering, index, video.mounted, video.attempt])

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

  // `src` de reserva = un escalón de la escalera del feed (320/480/640), NO
  // el ancho exacto de la tarjeta: un ancho suelto (`w_189`) crearía una
  // versión única en Cloudinary por cada ancho de columna. El navegador
  // elige del `srcset`.
  const fallbackWidth = pickFeedImageWidth(style.width)
  const imageUrl = isVideoSlide
    ? buildVideoPosterUrl(
        current.cloudinaryPublicId,
        { width: fallbackWidth },
        'feed',
      )
    : buildImageUrl(current.cloudinaryPublicId, 'feed', fallbackWidth)

  // Las Tools conservan una única ficha aunque tengan muchos pines. El
  // servidor ya añade ?pin=<unitId> al destino; si este pin es carrusel,
  // añadimos el índice del slide que el usuario está viendo justo ahora.
  // Así la ficha puede usar exactamente ese medio como portada.
  const destination =
    isCarousel && pin.destination.startsWith('/tools/')
      ? `${pin.destination}${pin.destination.includes('?') ? '&' : '?'}slide=${index}`
      : pin.destination

  return (
    <a
      ref={cardRef}
      href={destination}
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
        {/* El póster (o la imagen) es SIEMPRE la capa de base: el vídeo
            solo la tapa cuando ya está listo y reproduciendo. La URL ya
            viene transformada (calidad, ancho de la escalera) por
            modules/media/infrastructure/cloudinaryUrl.ts; next/image la
            retransformaría de nuevo sin necesidad (arquitectura §9.2). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          srcSet={
            isVideoSlide
              ? buildVideoPosterSrcSet(current.cloudinaryPublicId)
              : buildImageSrcSet(current.cloudinaryPublicId, 'feed')
          }
          sizes={`${Math.round(style.width)}px`}
          alt={pin.alt}
          loading="lazy"
          decoding="async"
          className={styles.image}
        />
        {video.mounted && (
          <video
            key={`${pin.pinId}-${index}-${video.attempt}`}
            ref={videoRef}
            className={`${styles.video} ${video.visible ? styles.videoVisible : ''}`}
            muted
            loop={!isCarousel}
            playsInline
            preload="auto"
            // El póster de debajo ya lleva el `alt`.
            aria-hidden="true"
            onCanPlay={video.handlers.onCanPlay}
            onPlaying={video.handlers.onPlaying}
            onPause={video.handlers.onPause}
            onError={video.handlers.onVideoError}
            onEnded={handleVideoEnded}
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
        {pin.cta && <span className={styles.cta}>{pin.cta}</span>}
      </div>
      {(pin.displayTitle || pin.label) && (
        <div className={styles.label}>
          {pin.displayTitle ? (
            <>
              <span className={styles.labelPrimary}>{pin.displayTitle}</span>

              {pin.displaySecondary && (
                <strong className={styles.labelSecondary}>
                  {pin.displaySecondary}
                </strong>
              )}
            </>
          ) : (
            <span className={styles.labelHook}>{pin.label}</span>
          )}
        </div>
      )}
    </a>
  )
}

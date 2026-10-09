'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
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
  // Solo tiene efecto en un pin de vídeo — ver más abajo.
  autoplayMode: 'viewport' | 'hover' | null
  // Un pin es un único medio (7 oct 2026, §2.41: sin carrusel de pines).
  // Es una lista por compatibilidad con los datos del feed: se usa el
  // primer elemento.
  media: PinCardMedia[]
}

export interface PinCardStyle {
  x: number
  y: number
  width: number
  height: number
}

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

/**
 * Destinos que NO son páginas de Next sino route handlers que devuelven un
 * documento HTML propio (el paquete de una tool/insight): necesitan una
 * carga completa, el router de Next no sabe navegar a ellos.
 */
const DOCUMENT_ROUTE = /^\/(tools|insights)\/[^/]+\/app(\/|$)/

/**
 * Enlace de la tarjeta (auditoría 8 oct, P0-8). Con un `<a>` plano cada clic
 * recargaba el documento: se perdía el estado de FeedProvider (sesión, pines
 * y scroll en memoria, arquitectura §6.2) y al volver se abría un feed nuevo.
 * Con `Link` la navegación es interna y (public)/layout.tsx no se desmonta.
 * `prefetch={false}`: con 40 pines por lote, precargar cada ficha (páginas
 * dinámicas) multiplicaría las peticiones al servidor sin necesidad.
 */
function CardLink({
  href,
  children,
  ...props
}: {
  href: string
  children: ReactNode
  cardRef: React.Ref<HTMLAnchorElement>
  className: string
  style: React.CSSProperties
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: () => void
  onBlur: () => void
  onClick: () => void
}) {
  const { cardRef, ...anchorProps } = props

  if (DOCUMENT_ROUTE.test(href)) {
    return (
      <a ref={cardRef} href={href} {...anchorProps}>
        {children}
      </a>
    )
  }

  return (
    <Link ref={cardRef} href={href} prefetch={false} {...anchorProps}>
      {children}
    </Link>
  )
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
function analyticsPinType(media: PinCardMedia[]): 'image' | 'video' {
  return media[0]?.kind === 'video' ? 'video' : 'image'
}

/**
 * Tarjeta de pin: imagen optimizada para feed (nunca el original — política
 * de medios §3), espacio reservado antes de la descarga (evita CLS, §9.2,
 * §10.1) y posicionada por transform, no por flujo normal del documento.
 *
 * Reproducción de vídeo, según `pin.autoplayMode` (§9.1, ABM) —
 * 'viewport' compite por uno de los
 * huecos globales del feed (2 escritorio / 1 móvil, §9.3, ver
 * videoPlaybackCoordinator.ts); 'hover' reproduce solo mientras el
 * puntero está encima, sin competir por ningún hueco (es una acción
 * explícita del usuario, no reproducción ambiental); `null` nunca
 * reproduce — poster estático siempre.
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

  const [hovering, setHovering] = useState(false)
  const cardRef = useRef<HTMLAnchorElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { feedAutoplayAllowed } = useMotionPreferences()

  const current = media[0]
  const isVideoSlide = current?.kind === 'video'

  // Un vídeo largo (> PIN_ANIMATION_LIMITS) sigue siendo un vídeo — se
  // pinta con su poster —, pero NO se anima ni compite por un hueco: solo
  // se reproduce en el detalle. Así el feed nunca descarga uno entero.
  const isAnimatable =
    isVideoSlide && canAnimateInFeed(current?.durationSeconds)

  // Un pin de vídeo solo compite por un hueco global en modo 'viewport' —
  // 'hover' no compite (arriba, en el docstring, se explica el porqué). Sin autoplay
  // permitido en el feed (reduced-motion, save-data, conexión lenta) no
  // compite por nada: póster fijo.
  const wantsGlobalSlot =
    isAnimatable && feedAutoplayAllowed && pin.autoplayMode === 'viewport'
  const hasSlot = useVideoSlot(videoId, cardRef, wantsGlobalSlot)

  const isPlaying =
    isAnimatable &&
    (pin.autoplayMode === 'viewport'
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
    resetKey: current?.cloudinaryPublicId ?? '',
    sourceCount: sources.length,
    // Solo se hace prefetch de lo que puede llegar a reproducirse: un pin de
    // un único vídeo sin `autoplayMode` nunca se anima y no gasta ancho de
    // banda (en Cloudinary Free cada MB cuenta).
    prefetchEnabled:
      isAnimatable && feedAutoplayAllowed && pin.autoplayMode !== null,
    wantsPlay: isPlaying,
  })

  if (!current) return null

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
  // servidor ya añade ?pin=<pinId> al destino, y la ficha usa el medio de
  // ese pin como miniatura.
  const destination = pin.destination

  return (
    <CardLink
      cardRef={cardRef}
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
            key={`${pin.pinId}-${video.attempt}`}
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
    </CardLink>
  )
}

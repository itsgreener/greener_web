'use client'

import { useMemo, useRef, useState } from 'react'
import { buildFeedVideoSources } from '@/modules/media/client/cloudinaryUrl'
import { canAnimateInFeed } from '@/modules/media/domain/mediaLimits'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { useMotionPreferences } from '@/lib/useMotionPreferences'
import { useVideoSlot } from '@/components/pin/useVideoSlot'
import { usePinVideo } from '@/components/pin/usePinVideo'
import { CardLink } from './CardLink'
import { PinCardLabel } from './PinCardLabel'
import { PinCardMedia } from './PinCardMedia'
import type {
  PinAnalyticsContext,
  PinCardData,
  PinCardStyle,
  PinMediaData,
} from './types'
import styles from './PinCard.module.css'

export type {
  PinAnalyticsContext,
  PinCardData,
  PinCardStyle,
  PinMediaData,
} from './types'

/**
 * `pinType` del evento "Pin Click" (§18.2) — ya no existe un `pin_type`
 * de base de datos del que leerlo directamente, se deriva del propio
 * array de medios que ya tiene el componente.
 */
function analyticsPinType(media: PinMediaData[]): 'image' | 'video' {
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
 * Carga del vídeo (contrato de medios, fase 1): el póster es
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
      <PinCardMedia
        pinId={pin.pinId}
        ratio={pin.ratio}
        alt={pin.alt}
        cta={pin.cta}
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
      />
    </CardLink>
  )
}

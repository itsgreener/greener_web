'use client'

import { useMemo, useRef, type RefObject } from 'react'

import { useMotionPreferences } from '@/lib/useMotionPreferences'
import { buildFeedVideoSources } from '@/modules/media/client/cloudinaryUrl'
import { canAnimateInFeed } from '@/modules/media/domain/mediaLimits'
import { usePinVideo } from '@/components/pin/usePinVideo'
import { useVideoSlot } from '@/components/pin/useVideoSlot'

import type { PinMediaData } from './types'

/**
 * Reproducción del medio de UNA tarjeta o de UNA diapositiva de carrusel:
 * hueco global de vídeo, prefetch, listo-para-reproducir y fuentes. Es lo que
 * hacía `PinCard` en línea; sale a un hook para que cada diapositiva de un
 * carrusel de pines lo use con sus propios datos (§2.150).
 *
 * `enabled` = false (una diapositiva que no es la visible) deja el vídeo sin
 * montar: no compite por ningún hueco ni hace prefetch.
 *
 * Un vídeo largo (> PIN_ANIMATION_LIMITS) sigue siendo un vídeo — se pinta con
 * su poster —, pero NO se anima ni compite por un hueco: solo se reproduce en
 * el detalle. Así el feed nunca descarga uno entero.
 */
export function usePinPlayback({
  videoId,
  cardRef,
  media,
  autoplayMode,
  hovering,
  enabled = true,
}: {
  /** Identidad en el coordinador de vídeo: una por tarjeta (y por diapositiva). */
  videoId: string
  /** La tarjeta entera: es lo que se observa para el hueco y el prefetch. */
  cardRef: RefObject<HTMLElement | null>
  media: PinMediaData | undefined
  autoplayMode: 'viewport' | 'hover' | null
  hovering: boolean
  enabled?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { feedAutoplayAllowed } = useMotionPreferences()

  const isVideoSlide = media?.kind === 'video'
  const isAnimatable =
    enabled && isVideoSlide && canAnimateInFeed(media?.durationSeconds)

  // Un vídeo solo compite por un hueco global en modo 'viewport'; 'hover' no
  // compite (es una acción explícita del usuario, no reproducción ambiental).
  // Sin autoplay permitido en el feed (reduced-motion, save-data, conexión
  // lenta) no compite por nada: póster fijo.
  const wantsGlobalSlot =
    isAnimatable && feedAutoplayAllowed && autoplayMode === 'viewport'
  const hasSlot = useVideoSlot(videoId, cardRef, wantsGlobalSlot)

  const isPlaying =
    isAnimatable &&
    (autoplayMode === 'viewport'
      ? hasSlot
      : autoplayMode === 'hover'
        ? // Sin autoplay permitido el hover tampoco reproduce: póster fijo.
          feedAutoplayAllowed && hovering
        : false)

  // Fuentes del vídeo: dos explícitas (WebM/VP9 y MP4/H.264), a un solo ancho
  // (contrato de medios §4.4-§4.5).
  const sources = useMemo(
    () =>
      isVideoSlide && media
        ? buildFeedVideoSources(media.cloudinaryPublicId)
        : [],
    [isVideoSlide, media],
  )

  // Prefetch, listo-para-reproducir, tiempo máximo y reintentos del vídeo.
  const video = usePinVideo({
    id: videoId,
    cardRef,
    videoRef,
    resetKey: media?.cloudinaryPublicId ?? '',
    sourceCount: sources.length,
    // Solo se hace prefetch de lo que se reproduce solo al entrar en pantalla
    // (`viewport`). Un pin `hover` no precarga nada: el vídeo se pide cuando
    // hay intención de hover (en Cloudinary Free cada MB cuenta).
    prefetchEnabled:
      isAnimatable && feedAutoplayAllowed && autoplayMode === 'viewport',
    wantsPlay: isPlaying,
  })

  return { video, videoRef, sources, isPlaying }
}

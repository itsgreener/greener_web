'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { pickDetailWidth } from '@/modules/media/domain/mediaDelivery'
import {
  buildVideoDetailUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import { useMotionPreferences } from '@/lib/useMotionPreferences'

/**
 * Qué quiere el visitante respecto a la reproducción:
 * - 'auto': nada decidido, manda la política automática (autoplay solo si
 *   no hay reduced-motion ni save-data, y solo mientras el vídeo se ve).
 * - 'play': ha pulsado «Play» — se reproduce (mientras se vea) aunque la
 *   política automática no lo permitiera.
 * - 'pause': ha pulsado «Pause» — no se reproduce solo hasta que lo pida.
 */
type Intent = 'auto' | 'play' | 'pause'

/**
 * Estado y efectos del vídeo de la ficha de una tool (5 oct 2026): mudo, en
 * bucle, con botón de pausa visible (WCAG 2.2.2: todo movimiento de más de
 * 5 s que arranca solo necesita un mecanismo para pausarlo). Queda FUERA
 * del videoPlaybackCoordinator del feed: es el único vídeo «principal» de
 * la página y no debe competir con las recomendaciones por un hueco.
 */
export function useToolCoverVideo({
  publicId,
  boxWidthPx,
}: {
  publicId: string
  /** Ancho CSS de la caja de la portada (computeContentBlockGeometry). */
  boxWidthPx: number
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const { autoplayAllowed } = useMotionPreferences()

  const [intent, setIntent] = useState<Intent>('auto')
  const [inView, setInView] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)

  // Densidad de píxeles: solo existe en cliente. Diferido para no hacer un
  // setState síncrono en el cuerpo del efecto (mismo patrón que useFeed.ts).
  useEffect(() => {
    queueMicrotask(() => setDevicePixelRatio(window.devicePixelRatio || 1))
  }, [])

  // El mismo cálculo de caja que la imagen (computeContentBlockGeometry);
  // aquí solo se traduce a uno de los anchos de entrega de detalle. Sin caja
  // medida todavía (0) no hay `src`: se enseña el poster.
  const width =
    boxWidthPx > 0 ? pickDetailWidth(boxWidthPx, devicePixelRatio) : null
  const src = width ? buildVideoDetailUrl(publicId, width) : undefined
  const poster = buildVideoPosterUrl(publicId)

  const shouldPlay =
    intent === 'pause'
      ? false
      : intent === 'play'
        ? inView
        : autoplayAllowed && inView

  // Solo se reproduce mientras se ve (al hacer scroll hacia las
  // recomendaciones el vídeo se pausa solo y no gasta CPU ni batería).
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setInView(entry.isIntersecting)
      },
      { threshold: 0.25 },
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !src) return

    if (shouldPlay) {
      // `muted` también como propiedad: el atributo que React serializa en
      // el HTML del servidor no basta para algunos navegadores y sin audio
      // silenciado el autoplay se bloquea.
      el.muted = true
      try {
        // Autoplay bloqueado (o sin soporte de vídeo, jsdom): se queda en
        // el poster con el botón «Play», no rompe nada.
        el.play()?.catch(() => {})
      } catch {
        // ver comentario de arriba
      }
    } else {
      try {
        el.pause()
      } catch {
        // jsdom
      }
    }
  }, [shouldPlay, src])

  const toggle = useCallback(() => {
    const el = videoRef.current

    if (isPlaying) {
      setIntent('pause')
      try {
        el?.pause()
      } catch {
        // jsdom
      }
      return
    }

    setIntent('play')
    // Dentro del gesto del usuario, para que el navegador lo permita
    // aunque el autoplay estuviera bloqueado.
    try {
      if (el) el.muted = true
      el?.play()?.catch(() => {})
    } catch {
      // jsdom
    }
  }, [isPlaying])

  const onPlay = useCallback(() => setIsPlaying(true), [])
  const onPause = useCallback(() => setIsPlaying(false), [])

  return {
    videoRef,
    wrapperRef,
    src,
    poster,
    autoplayAllowed,
    isPlaying,
    toggle,
    onPlay,
    onPause,
  }
}

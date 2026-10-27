'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  detailVideoRungM,
  pickDetailVideoRung,
} from '@/modules/media/domain/mediaDelivery'
import {
  buildVideoPosterUrl,
  buildVideoSources,
} from '@/modules/media/client/cloudinaryUrl'
import { safePause, safePlay } from '@/modules/media/client/safePlayback'
import { useVideoLoadLifecycle } from '@/modules/media/client/useVideoLoadLifecycle'
import { useMotionPreferences } from '@/lib/useMotionPreferences'

import type { PinRatioValue } from '@/modules/shared/domain/ratio'
/**
 * Qué quiere el visitante respecto a la reproducción:
 * - 'auto': nada decidido, manda la política automática (autoplay solo si
 *   no hay reduced-motion ni save-data, y solo mientras el vídeo se ve).
 * - 'play': ha pulsado «Play» — se reproduce (mientras se vea) aunque la
 *   política automática no lo permitiera.
 * - 'pause': ha pulsado «Pause» — no se reproduce solo hasta que lo pida.
 */
type Intent = 'auto' | 'play' | 'pause'

// La densidad de píxeles no cambia durante la vida de la página: no hay nada
// a lo que suscribirse. useSyncExternalStore da el valor de cliente sin
// desajuste de hidratación (en servidor, 1) y sin un segundo render con otro
// escalón, que pediría DOS versiones del mismo vídeo.
const subscribeNever = () => () => {}
const getDevicePixelRatio = () => window.devicePixelRatio || 1
const getServerDevicePixelRatio = () => 1

/**
 * Estado y efectos del vídeo de la ficha de una tool: mudo, en
 * bucle, con botón de pausa visible (WCAG 2.2.2: todo movimiento de más de
 * 5 s que arranca solo necesita un mecanismo para pausarlo). Queda FUERA
 * del videoPlaybackCoordinator del feed: es el único vídeo «principal» de
 * la página y no debe competir con las recomendaciones por un hueco.
 *
 * Contrato de medios, fase 1:
 * - Escalón M o L según la caja real y el DPR (`pickDetailVideoRung`), dos
 *   fuentes explícitas (WebM/VP9 y MP4/H.264), sin audio.
 * - El póster tapa el vídeo hasta que éste está reproduciendo (`playing`).
 * - Si en ~10 s no está listo se abandona la descarga y queda el póster con
 *   el botón de reproducir; ante un error se reintenta (3 s y 8 s). Ese ciclo
 *   de carga lo comparte con los pines del feed (`useVideoLoadLifecycle`).
 */
export function useToolCoverVideo({
  publicId,
  ratio,
  boxWidthPx,
  boxHeightPx,
}: {
  publicId: string
  /** Ratio cerrado del pin: decide la tabla de escalones M/L. */
  ratio: PinRatioValue
  /** Caja de la portada (computeContentBlockGeometry), px CSS. */
  boxWidthPx: number
  boxHeightPx: number
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const { autoplayAllowed } = useMotionPreferences()

  const [intent, setIntent] = useState<Intent>('auto')
  const [inView, setInView] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  // Se incrementa al volver a pedir el vídeo tras abandonarlo: remonta el
  // `<video>` aunque el resto de la clave no cambie.
  const [generation, setGeneration] = useState(0)
  const [startedKey, setStartedKey] = useState<string | null>(null)

  const devicePixelRatio = useSyncExternalStore(
    subscribeNever,
    getDevicePixelRatio,
    getServerDevicePixelRatio,
  )

  // Sin caja medida todavía (0) no hay fuentes: se enseña el póster.
  const rung =
    boxWidthPx > 0 && boxHeightPx > 0
      ? pickDetailVideoRung({
          ratio,
          boxWidthPx,
          boxHeightPx,
          devicePixelRatio,
        })
      : null
  const rungId = rung?.rung ?? 'none'
  const sourceWidth = rung?.width ?? 0
  const sourceHeight = rung?.height ?? 0

  const sources =
    sourceWidth > 0
      ? buildVideoSources(publicId, 'toolDetail', {
          width: sourceWidth,
          height: sourceHeight,
        })
      : []

  // El póster tiene el tamaño del escalón elegido (que no se vea más borroso
  // que el vídeo). Antes de medir la caja, el del escalón M.
  const posterSize = rung ?? detailVideoRungM(ratio)
  const poster = buildVideoPosterUrl(
    publicId,
    { width: posterSize.width, height: posterSize.height },
    'detail',
  )

  // Solo cuenta el tiempo máximo cuando se ha pedido el vídeo: con
  // reduced-motion/save-data (`preload="none"`) no se descarga nada hasta que
  // el visitante pulsa «Play».
  const wantsLoad = autoplayAllowed || intent === 'play'

  const {
    load,
    dispatch,
    mounted: showSources,
    handlers: loadHandlers,
  } = useVideoLoadLifecycle({
    wanted: sources.length > 0,
    loadRequested: wantsLoad,
    resetKey: `${rungId}-${generation}`,
    sourceCount: sources.length,
    videoRef,
  })

  // Un `<source>` añadido a un `<video>` ya cargado no recarga nada: cada
  // escalón, reintento o nueva petición necesita un elemento nuevo.
  const videoKey = `${rungId}-${load.attempt}-${generation}`

  const shouldPlay =
    intent === 'pause'
      ? false
      : intent === 'play'
        ? inView
        : autoplayAllowed && inView

  // Otro escalón (la ventana cambió de tamaño): ciclo nuevo.
  // No se ejecuta en el montaje (no hay nada que reiniciar): solo cuando el
  // escalón CAMBIA, para no pisar eventos que lleguen justo tras montar.
  const previousRungId = useRef(rungId)
  useEffect(() => {
    if (previousRungId.current === rungId) return
    previousRungId.current = rungId

    queueMicrotask(() => {
      dispatch('reset')
      setIsPlaying(false)
    })
  }, [rungId, dispatch])

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
    if (!el || !showSources) return

    // Autoplay bloqueado (o sin soporte de vídeo, jsdom): se queda en el
    // póster con el botón «Play», no rompe nada.
    if (shouldPlay) safePlay(el)
    else safePause(el)
  }, [shouldPlay, showSources, videoKey])

  const toggle = useCallback(() => {
    const el = videoRef.current

    if (isPlaying) {
      setIntent('pause')
      safePause(el)
      return
    }

    setIntent('play')

    // Si se había abandonado la descarga (tiempo máximo, reintentos
    // agotados), pulsar «Play» es volver a pedirlo desde cero.
    if (load.phase === 'gaveup' || load.phase === 'retrying') {
      dispatch('reset')
      setGeneration((g) => g + 1)
      return
    }

    // Dentro del gesto del usuario, para que el navegador lo permita
    // aunque el autoplay estuviera bloqueado.
    safePlay(el)
  }, [isPlaying, load.phase, dispatch])

  const onPlay = useCallback(() => setIsPlaying(true), [])
  const onPause = useCallback(() => setIsPlaying(false), [])

  const onPlaying = useCallback(() => {
    dispatch('ready')
    setStartedKey(videoKey)
  }, [videoKey, dispatch])

  return {
    videoRef,
    wrapperRef,
    sources: showSources ? sources : [],
    poster,
    videoKey,
    /** El póster tapa el vídeo hasta que éste está reproduciendo. */
    posterHidden: startedKey === videoKey,
    autoplayAllowed,
    isPlaying,
    toggle,
    onPlay,
    onPause,
    handlers: { ...loadHandlers, onPlaying },
  }
}

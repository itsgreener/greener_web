'use client'

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from 'react'
import type { PinRatioValue } from '@/modules/media/domain/closestRatio'
import {
  detailVideoRungM,
  pickDetailVideoRung,
} from '@/modules/media/domain/mediaDelivery'
import {
  INITIAL_VIDEO_LOAD_STATE,
  READY_TIMEOUT_MS,
  isVideoReady,
  nextRetryDelay,
  videoLoadReducer,
} from '@/modules/media/domain/videoPlayback'
import {
  buildVideoPosterUrl,
  buildVideoSources,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import { releaseVideoElement } from '@/modules/media/infrastructure/releaseVideoElement'
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

// La densidad de píxeles no cambia durante la vida de la página: no hay nada
// a lo que suscribirse. useSyncExternalStore da el valor de cliente sin
// desajuste de hidratación (en servidor, 1) y sin un segundo render con otro
// escalón, que pediría DOS versiones del mismo vídeo.
const subscribeNever = () => () => {}
const getDevicePixelRatio = () => window.devicePixelRatio || 1
const getServerDevicePixelRatio = () => 1

/**
 * Estado y efectos del vídeo de la ficha de una tool (5 oct 2026): mudo, en
 * bucle, con botón de pausa visible (WCAG 2.2.2: todo movimiento de más de
 * 5 s que arranca solo necesita un mecanismo para pausarlo). Queda FUERA
 * del videoPlaybackCoordinator del feed: es el único vídeo «principal» de
 * la página y no debe competir con las recomendaciones por un hueco.
 *
 * Fase 1 del contrato de medios (7 oct 2026):
 * - Escalón M o L según la caja real y el DPR (`pickDetailVideoRung`), dos
 *   fuentes explícitas (WebM/VP9 y MP4/H.264), sin audio.
 * - El póster tapa el vídeo hasta que éste está reproduciendo (`playing`).
 * - Si en ~10 s no está listo se abandona la descarga y queda el póster con
 *   el botón de reproducir; ante un error se reintenta (3 s y 8 s).
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
  const [load, dispatch] = useReducer(
    videoLoadReducer,
    INITIAL_VIDEO_LOAD_STATE,
  )
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

  const showSources =
    sources.length > 0 && load.phase !== 'retrying' && load.phase !== 'gaveup'
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
  }, [rungId])

  // Tiempo máximo hasta estar listo. Solo cuenta cuando se ha pedido el
  // vídeo: con reduced-motion/save-data (`preload="none"`) no se descarga
  // nada hasta que el visitante pulsa «Play».
  const wantsLoad = autoplayAllowed || intent === 'play'
  useEffect(() => {
    if (!showSources || !wantsLoad || load.phase !== 'loading') return

    const timer = setTimeout(() => dispatch('timeout'), READY_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [showSources, wantsLoad, load.phase, videoKey])

  // Espera y reintento tras un error.
  useEffect(() => {
    const delay = nextRetryDelay(load)
    if (delay === null) return

    const timer = setTimeout(() => dispatch('retry'), delay)

    return () => clearTimeout(timer)
  }, [load])

  // Suelta el elemento al sustituirlo (otro escalón, reintento, abandono).
  useEffect(() => {
    const el = videoRef.current
    if (!el || !showSources) return

    return () => releaseVideoElement(el)
  }, [videoKey, showSources])

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
  }, [shouldPlay, showSources, videoKey])

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

    // Si se había abandonado la descarga (tiempo máximo, reintentos
    // agotados), pulsar «Play» es volver a pedirlo desde cero.
    if (load.phase === 'gaveup' || load.phase === 'retrying') {
      dispatch('reset')
      setGeneration((g) => g + 1)
      return
    }

    // Dentro del gesto del usuario, para que el navegador lo permita
    // aunque el autoplay estuviera bloqueado.
    try {
      if (el) el.muted = true
      el?.play()?.catch(() => {})
    } catch {
      // jsdom
    }
  }, [isPlaying, load.phase])

  const onPlay = useCallback(() => setIsPlaying(true), [])
  const onPause = useCallback(() => setIsPlaying(false), [])

  const onCanPlay = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    if (isVideoReady(event.currentTarget.readyState)) dispatch('ready')
  }, [])

  const onPlaying = useCallback(() => {
    dispatch('ready')
    setStartedKey(videoKey)
  }, [videoKey])

  // React hace burbujear en su árbol el `error` de un `<source>` hasta el
  // `onError` del `<video>`: solo cuenta el error del PROPIO vídeo (p. ej.
  // fallo de decodificación). El de una fuente suelta lo resuelve el
  // navegador probando la siguiente (ver onSourceError).
  const onVideoError = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      if (event.target === event.currentTarget) dispatch('error')
    },
    [],
  )

  // Con varios `<source>` el error llega a cada `<source>`, no al `<video>`;
  // solo el del último significa que ya no queda alternativa.
  const onSourceError = useCallback(
    (index: number) => {
      if (index === sources.length - 1) dispatch('error')
    },
    [sources.length],
  )

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
    handlers: { onCanPlay, onPlaying, onVideoError, onSourceError },
  }
}

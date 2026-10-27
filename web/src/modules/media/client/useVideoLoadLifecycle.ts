'use client'

import {
  useCallback,
  useEffect,
  useReducer,
  type RefObject,
  type SyntheticEvent,
} from 'react'

import {
  INITIAL_VIDEO_LOAD_STATE,
  READY_TIMEOUT_MS,
  isVideoReady,
  nextRetryDelay,
  videoLoadReducer,
} from '@/modules/media/domain/videoPlayback'
import { releaseVideoElement } from '@/modules/media/client/releaseVideoElement'

/**
 * Ciclo de carga de un `<video>` (contrato de medios §6.3 y §6.5), común al
 * vídeo de un pin del feed y al de la portada de una tool. La política
 * (cuánto se espera, cuántos reintentos) vive en
 * `modules/media/domain/videoPlayback.ts`; aquí se conecta con React y con el
 * DOM:
 *
 * 1. Estado de carga (`loading`, `ready`, `retrying`, `gaveup`).
 * 2. Tiempo máximo hasta estar listo: si no, se abandona la descarga.
 * 3. Espera y reintento tras un error.
 * 4. Suelta el elemento al quitarlo del DOM (billete perdido, rendición,
 *    reintento, otro vídeo o desmontaje).
 * 5. Los manejadores de `canplay` y de error del `<video>` y de sus `<source>`.
 *
 * Cada vídeo conserva lo suyo: cuándo se quiere montar (`wanted`), qué
 * significa «empezar» (`playing`) y cuándo se reinicia el ciclo.
 */
export function useVideoLoadLifecycle({
  wanted,
  loadRequested = true,
  resetKey,
  sourceCount,
  videoRef,
}: {
  /** ¿Se quiere el `<video>` montado? (billete de prefetch, fuentes listas…). */
  wanted: boolean
  /**
   * ¿Se ha pedido ya la descarga? El tiempo máximo solo cuenta entonces: con
   * `preload="none"` (reduced-motion, save-data) no se descarga nada hasta que
   * el visitante pulsa «Play», y no hay nada que abandonar.
   */
  loadRequested?: boolean
  /**
   * Cambia cuando cambia el vídeo (otro escalón, otra petición). El reintento
   * (`load.attempt`) ya se vigila por separado.
   */
  resetKey: string
  /** Cuántos `<source>` tiene el `<video>`: solo el error del último cuenta. */
  sourceCount: number
  /** Lo crea el componente: un hook que lo devolviera dentro de su resultado haría saltar react-hooks/refs. */
  videoRef: RefObject<HTMLVideoElement | null>
}) {
  const [load, dispatch] = useReducer(
    videoLoadReducer,
    INITIAL_VIDEO_LOAD_STATE,
  )

  // Tras rendirse o mientras espera un reintento, el `<video>` ya no existe.
  const mounted = wanted && load.phase !== 'gaveup' && load.phase !== 'retrying'

  // Tiempo máximo hasta estar listo.
  useEffect(() => {
    if (!mounted || !loadRequested || load.phase !== 'loading') return

    const timer = setTimeout(() => dispatch('timeout'), READY_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [mounted, loadRequested, load.phase, load.attempt, resetKey])

  // Espera y reintento tras un error.
  useEffect(() => {
    const delay = nextRetryDelay(load)
    if (delay === null) return

    const timer = setTimeout(() => dispatch('retry'), delay)

    return () => clearTimeout(timer)
  }, [load])

  // Suelta el elemento al quitarlo.
  useEffect(() => {
    if (!mounted) return
    const el = videoRef.current
    if (!el) return

    return () => releaseVideoElement(el)
  }, [mounted, load.attempt, resetKey, videoRef])

  const onCanPlay = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    if (isVideoReady(event.currentTarget.readyState)) dispatch('ready')
  }, [])

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

  // Con varios `<source>`, el error no llega al `<video>`: llega a cada
  // `<source>`. Solo el del ÚLTIMO significa que ya no queda alternativa.
  const onSourceError = useCallback(
    (index: number) => {
      if (index === sourceCount - 1) dispatch('error')
    },
    [sourceCount],
  )

  return {
    load,
    dispatch,
    /** ¿Hay que pintar el `<video>`? `wanted` y sin haberse rendido. */
    mounted,
    handlers: { onCanPlay, onVideoError, onSourceError },
  }
}

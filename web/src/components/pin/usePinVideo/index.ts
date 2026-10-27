'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'
import {
  PREFETCH_ACQUIRE_SCREENS,
  PREFETCH_RELEASE_SCREENS,
} from '@/modules/media/domain/videoPlayback'
import { safePause, safePlay } from '@/modules/media/client/safePlayback'
import { useVideoLoadLifecycle } from '@/modules/media/client/useVideoLoadLifecycle'
import { videoPlaybackCoordinator } from '@/components/pin/videoPlaybackCoordinator'

function isNear(entry: IntersectionObserverEntry): boolean {
  // `intersectionRatio` por si algún entorno no informa de `isIntersecting`.
  return entry.isIntersecting || entry.intersectionRatio > 0
}

/**
 * Ciclo de vida del `<video>` de un pin del feed (contrato de medios §6):
 *
 * 1. PREFETCH. Con billete del coordinador (a menos de una pantalla, con un
 *    máximo de 3 en escritorio y 2 en móvil) el `<video>` se monta OCULTO
 *    bajo el póster y empieza a descargar; se suelta a más de dos pantallas.
 * 2. LISTO PARA REPRODUCIR. El vídeo solo sustituye al póster cuando
 *    `readyState ≥ 3` y ya está reproduciendo (`playing`): antes, el usuario
 *    solo ve el póster. Es lo que evita los tirones al entrar en pantalla.
 * 3. TIEMPO MÁXIMO Y REINTENTOS. Si en ~10 s no está listo, se aborta (se
 *    quita el `<video>`) y se queda el póster; ante un ERROR (p. ej. una
 *    versión aún generándose) se reintenta hasta 2 veces, a 3 s y a 8 s.
 *
 * Toda la política vive en `modules/media/domain/videoPlayback.ts` y el ciclo
 * de carga (tiempo máximo, reintentos, soltar el elemento) en
 * `useVideoLoadLifecycle`, que comparte con la portada de las tools; aquí
 * queda lo propio del pin: el billete de prefetch y qué es «reproduciendo».
 * `wantsPlay` lo decide quien llama (hueco de reproducción o hover).
 */
export function usePinVideo({
  id,
  cardRef,
  videoRef,
  resetKey,
  sourceCount,
  prefetchEnabled,
  wantsPlay,
}: {
  /** Clave en el coordinador: la misma que usa `useVideoSlot` (el pinId). */
  id: string
  cardRef: RefObject<HTMLElement | null>
  /** Lo crea el componente (no el hook): un hook que devolviera el ref dentro de su resultado haría saltar react-hooks/refs. */
  videoRef: RefObject<HTMLVideoElement | null>
  /** Cambia cuando cambia el vídeo: reinicia el ciclo. */
  resetKey: string
  sourceCount: number
  /** Vídeo animable, y el visitante admite prefetch y autoplay en el feed. */
  prefetchEnabled: boolean
  wantsPlay: boolean
}) {
  const [hasTicket, setHasTicket] = useState(false)
  const [playing, setPlaying] = useState(false)

  // 1. Billete de prefetch según la cercanía al viewport, con histéresis:
  // se adquiere a menos de PREFETCH_ACQUIRE_SCREENS y se conserva hasta
  // PREFETCH_RELEASE_SCREENS.
  useEffect(() => {
    if (!prefetchEnabled) return

    const el = cardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const unregister = videoPlaybackCoordinator.registerPrefetch(
      id,
      setHasTicket,
    )

    let acquireNear = false
    let releaseNear = false
    let eligible = false

    function push(entry: IntersectionObserverEntry) {
      eligible = acquireNear || (eligible && releaseNear)

      const rect = entry.boundingClientRect
      const viewportHeight = window.innerHeight
      const distanceToViewport =
        rect.bottom < 0
          ? -rect.bottom
          : rect.top > viewportHeight
            ? rect.top - viewportHeight
            : 0

      videoPlaybackCoordinator.updatePrefetch(id, {
        eligible,
        distanceToViewport,
        distanceToCenter: Math.abs(
          (rect.top + rect.bottom) / 2 - viewportHeight / 2,
        ),
      })
    }

    const viewportHeight = window.innerHeight
    const acquireObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        acquireNear = isNear(entry)
        push(entry)
      },
      { rootMargin: `${viewportHeight * PREFETCH_ACQUIRE_SCREENS}px 0px` },
    )
    const releaseObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        releaseNear = isNear(entry)
        push(entry)
      },
      { rootMargin: `${viewportHeight * PREFETCH_RELEASE_SCREENS}px 0px` },
    )
    acquireObserver.observe(el)
    releaseObserver.observe(el)

    return () => {
      acquireObserver.disconnect()
      releaseObserver.disconnect()
      unregister()
      // Al soltar el prefetch (o desmontar) se pierde el billete: `unregister`
      // no avisa a quien se va (PUB-B6: sin `queueMicrotask`).
      setHasTicket(false)
    }
  }, [id, prefetchEnabled, cardRef])

  // `hasTicket` solo cuenta mientras el prefetch esté habilitado: al pasar de
  // un slide de vídeo a uno de imagen el billete anterior se suelta al limpiar
  // el efecto, y hasta ese render no debe mantener el `<video>` montado.
  const wanted = (prefetchEnabled && hasTicket) || wantsPlay

  const { load, dispatch, mounted, handlers } = useVideoLoadLifecycle({
    wanted,
    resetKey,
    sourceCount,
    videoRef,
  })

  // Se pierde el billete (o cambia el vídeo): se olvida lo aprendido, para
  // que al volver a tenerlo empiece de cero. Un «se rindió» NO se reinicia
  // mientras se siga queriendo el vídeo.
  useEffect(() => {
    queueMicrotask(() => {
      dispatch('reset')
      setPlaying(false)
    })
  }, [wanted, resetKey, dispatch])

  // Arranca o para el vídeo. Solo se reproduce cuando está listo; al volver a
  // reproducirse (otro hueco, otro hover) empieza desde el principio.
  useEffect(() => {
    const el = videoRef.current
    if (!el || !mounted) return

    if (wantsPlay && load.phase === 'ready') {
      safePlay(el, { restart: true })
    } else {
      safePause(el)
    }
  }, [wantsPlay, load.phase, load.attempt, mounted, resetKey, videoRef])

  const onPlaying = useCallback(() => {
    dispatch('ready')
    setPlaying(true)
  }, [dispatch])

  const onPause = useCallback(() => setPlaying(false), [])

  return {
    /** ¿Hay que pintar el `<video>` (oculto o visible)? */
    mounted,
    /** `key` del `<video>`: un reintento lo remonta y vuelve a pedir el vídeo. */
    attempt: load.attempt,
    /** ¿El vídeo ya sustituye al póster? Listo Y reproduciéndose. */
    visible: mounted && load.phase === 'ready' && wantsPlay && playing,
    /** ¿Se está reproduciendo de verdad? */
    isActuallyPlaying: mounted && wantsPlay && playing,
    handlers: { ...handlers, onPlaying, onPause },
  }
}

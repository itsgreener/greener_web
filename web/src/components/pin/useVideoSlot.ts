'use client'

import { useEffect, useState, type RefObject } from 'react'
import { videoPlaybackCoordinator } from './videoPlaybackCoordinator'

// Suficientes escalones para que el ratio de visibilidad se actualice de
// forma gradual al hacer scroll, no solo en las transiciones 0%/100%
// (el umbral por defecto de IntersectionObserver).
const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20)

/**
 * Se suscribe al VideoPlaybackCoordinator mientras `enabled` es true:
 * observa la visibilidad real de `ref` y reporta al coordinador su % de
 * visibilidad y distancia al centro del viewport en cada cambio.
 * Devuelve si esta tarjeta tiene ahora mismo un hueco de reproducción.
 */
export function useVideoSlot(
  id: string,
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled) {
      // Diferido: llamar a setState de forma síncrona en el cuerpo del
      // efecto dispara el aviso react-hooks/set-state-in-effect — un
      // queueMicrotask rompe esa cadena síncrona sin cambiar el
      // comportamiento real (mismo patrón ya usado en useFeed.ts).
      queueMicrotask(() => setActive(false))
      return
    }

    const el = ref.current
    if (!el) return

    const unregister = videoPlaybackCoordinator.register(id, setActive)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        const rect = entry.boundingClientRect
        const elementCenter = (rect.top + rect.bottom) / 2
        const viewportCenter = window.innerHeight / 2
        videoPlaybackCoordinator.update(
          id,
          entry.intersectionRatio,
          Math.abs(elementCenter - viewportCenter),
        )
      },
      { threshold: THRESHOLDS },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      unregister()
    }
  }, [id, enabled, ref])

  return active
}

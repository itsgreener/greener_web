'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { isSlowDownlink } from '@/modules/media/domain/videoPlayback'

/**
 * Preferencias del visitante que desaconsejan reproducir vídeo solo
 * (arquitectura §9.3):
 *
 * - `prefers-reduced-motion: reduce` — desactiva autoplay y animaciones.
 * - `save-data` o conexión 2G/«slow-2g» (Network Information API, solo
 *   Chromium) — «todo vídeo requiere interacción».
 *
 * Antes de este módulo (5 oct 2026) ninguna de las dos existía en el
 * código. Lo usa el vídeo de la ficha de las tools y, desde la fase 1 del
 * contrato de medios (7 oct), también los pines del feed.
 *
 * Aparte, `slowConnection` (contrato de medios §6.4): `downlink` por debajo
 * de ~1,5 Mbps (solo Chromium). Solo la usa el FEED (póster fijo, sin
 * prefetch): la ficha de una tool reproduce igualmente, con su póster hasta
 * que el vídeo esté listo, así que `autoplayAllowed` NO la incluye.
 *
 * Se lee con useSyncExternalStore: se actualiza si el usuario cambia el
 * ajuste con la página abierta, y en servidor (y en la primera pasada de
 * hidratación) devuelve «sin restricciones» — el cliente corrige justo
 * después.
 */

export interface MotionPreferences {
  reducedMotion: boolean
  saveData: boolean
  /** `downlink` estimado por debajo del umbral (solo Chromium). */
  slowConnection: boolean
  /** true si el autoplay está permitido (ni reduced-motion ni save-data). */
  autoplayAllowed: boolean
  /**
   * true si el FEED puede hacer prefetch y autoplay: `autoplayAllowed` y
   * además una conexión que no sea lenta.
   */
  feedAutoplayAllowed: boolean
}

type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
  downlink?: number
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined

  return (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection
}

export function readReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false

  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export function readSaveData(): boolean {
  const connection = getConnection()

  if (!connection) return false

  return (
    connection.saveData === true ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
  )
}

export function readSlowConnection(): boolean {
  return isSlowDownlink(getConnection()?.downlink)
}

// Instantánea como cadena («rsl»: reduced, save, slow) para que React
// compare por valor y no re-renderice si nada ha cambiado.
function getSnapshot(): string {
  return `${readReducedMotion() ? 1 : 0}${readSaveData() ? 1 : 0}${readSlowConnection() ? 1 : 0}`
}

function getServerSnapshot(): string {
  return '000'
}

function subscribe(onChange: () => void): () => void {
  const query =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(REDUCED_MOTION_QUERY)
      : undefined
  const connection = getConnection()

  query?.addEventListener?.('change', onChange)
  connection?.addEventListener?.('change', onChange)

  return () => {
    query?.removeEventListener?.('change', onChange)
    connection?.removeEventListener?.('change', onChange)
  }
}

export function useMotionPreferences(): MotionPreferences {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  return useMemo(() => {
    const reducedMotion = snapshot[0] === '1'
    const saveData = snapshot[1] === '1'
    const slowConnection = snapshot[2] === '1'
    const autoplayAllowed = !reducedMotion && !saveData

    return {
      reducedMotion,
      saveData,
      slowConnection,
      autoplayAllowed,
      feedAutoplayAllowed: autoplayAllowed && !slowConnection,
    }
  }, [snapshot])
}

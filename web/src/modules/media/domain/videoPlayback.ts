/**
 * Comportamiento de reproducción de vídeo (contrato-medios-fase-1.md §6).
 *
 * TODAS las constantes que condicionan cómo se carga y se reproduce un vídeo
 * viven aquí, en un solo sitio y fáciles de ajustar tras probar con
 * conexiones reales. Sin React ni DOM: la parte que decide (cuántos
 * prefetch, cuándo se rinde, cuándo se reintenta) se prueba con tests puros.
 */

/** Mismo umbral «móvil» que el primer breakpoint del masonry (<640 px). */
export const MOBILE_BREAKPOINT_PX = 640

/**
 * Prefetch: el `<video>` se monta (oculto bajo el póster) cuando la tarjeta
 * está a menos de una pantalla del viewport (§6.1)...
 */
export const PREFETCH_ACQUIRE_SCREENS = 1

/**
 * ...y se suelta cuando queda a más de dos pantallas (§6.6): la diferencia
 * entre ambas es la histéresis que evita montar y desmontar al hacer scroll
 * justo en el borde.
 */
export const PREFETCH_RELEASE_SCREENS = 2

/**
 * Tope de «billetes de prefetch»: cuántos `<video>` del feed pueden estar
 * montados descargando a la vez (§6.2). Aparte de los huecos de reproducción
 * (2 escritorio / 1 móvil), que SIEMPRE tienen billete. Conservador: con
 * ~0,3 MB por clip son, como máximo, ~1 MB en vuelo.
 */
export function getPrefetchLimit(viewportWidth: number): number {
  return viewportWidth < MOBILE_BREAKPOINT_PX ? 2 : 3
}

/** Si el vídeo no está listo en este tiempo se aborta la descarga (§6.5). */
export const READY_TIMEOUT_MS = 10_000

/**
 * Esperas antes de cada reintento ante un ERROR (por ejemplo, una versión
 * aún generándose en Cloudinary): hasta dos reintentos, a 3 s y a 8 s.
 */
export const RETRY_DELAYS_MS = [3_000, 8_000] as const

/**
 * Por debajo de este ancho de banda estimado (Mbps, solo Chromium) el feed
 * se queda con el póster fijo (§6.4). Umbral a ajustar.
 */
export const SLOW_DOWNLINK_MBPS = 1.5

/** HAVE_FUTURE_DATA: hay datos para reproducir un poco sin cortarse. */
export const HAVE_FUTURE_DATA = 3

export function isVideoReady(readyState: number): boolean {
  return readyState >= HAVE_FUTURE_DATA
}

export function isSlowDownlink(downlinkMbps: number | undefined): boolean {
  return (
    typeof downlinkMbps === 'number' &&
    downlinkMbps > 0 &&
    downlinkMbps < SLOW_DOWNLINK_MBPS
  )
}

/**
 * Ciclo de carga de un `<video>` (§6.3 y §6.5):
 *
 * - `loading`: descargando; el usuario solo ve el póster.
 * - `ready`: `readyState ≥ 3`; ya puede sustituir al póster.
 * - `retrying`: falló y espera su turno para reintentar (sin `<video>`).
 * - `gaveup`: se acabó el tiempo o los reintentos; se queda el póster hasta
 *   que se pierda y se recupere el billete (el estado se reinicia).
 */
export type VideoLoadPhase = 'loading' | 'ready' | 'retrying' | 'gaveup'

export interface VideoLoadState {
  phase: VideoLoadPhase
  /** Reintentos ya consumidos; también la `key` que remonta el `<video>`. */
  attempt: number
}

export type VideoLoadEvent = 'ready' | 'error' | 'timeout' | 'retry' | 'reset'

export const INITIAL_VIDEO_LOAD_STATE: VideoLoadState = {
  phase: 'loading',
  attempt: 0,
}

export function videoLoadReducer(
  state: VideoLoadState,
  event: VideoLoadEvent,
): VideoLoadState {
  switch (event) {
    case 'reset':
      return INITIAL_VIDEO_LOAD_STATE

    case 'ready':
      // Un 'ready' tardío tras rendirse o mientras se espera un reintento
      // no resucita nada: ese `<video>` ya no existe.
      return state.phase === 'loading' ? { ...state, phase: 'ready' } : state

    case 'timeout':
      return state.phase === 'loading' ? { ...state, phase: 'gaveup' } : state

    case 'error':
      if (state.phase !== 'loading' && state.phase !== 'ready') return state

      return state.attempt < RETRY_DELAYS_MS.length
        ? { ...state, phase: 'retrying' }
        : { ...state, phase: 'gaveup' }

    case 'retry':
      return state.phase === 'retrying'
        ? { phase: 'loading', attempt: state.attempt + 1 }
        : state
  }
}

/** Espera antes del siguiente reintento, o null si ya no quedan. */
export function nextRetryDelay(state: VideoLoadState): number | null {
  if (state.phase !== 'retrying') return null

  return RETRY_DELAYS_MS[state.attempt] ?? null
}

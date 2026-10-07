import { describe, it, expect } from 'vitest'
import {
  INITIAL_VIDEO_LOAD_STATE,
  READY_TIMEOUT_MS,
  RETRY_DELAYS_MS,
  SLOW_DOWNLINK_MBPS,
  getPrefetchLimit,
  isSlowDownlink,
  isVideoReady,
  nextRetryDelay,
  videoLoadReducer,
  type VideoLoadEvent,
  type VideoLoadState,
} from '@/modules/media/domain/videoPlayback'

function run(events: VideoLoadEvent[]): VideoLoadState {
  return events.reduce(videoLoadReducer, INITIAL_VIDEO_LOAD_STATE)
}

describe('constantes de reproducción (contrato §6)', () => {
  it('valores propuestos: 10 s de espera, reintentos a 3 s y 8 s, 1,5 Mbps', () => {
    expect(READY_TIMEOUT_MS).toBe(10_000)
    expect([...RETRY_DELAYS_MS]).toEqual([3_000, 8_000])
    expect(SLOW_DOWNLINK_MBPS).toBe(1.5)
  })

  it('prefetch: 3 descargas en escritorio y 2 en móvil (<640 px)', () => {
    expect(getPrefetchLimit(1440)).toBe(3)
    expect(getPrefetchLimit(640)).toBe(3)
    expect(getPrefetchLimit(639)).toBe(2)
    expect(getPrefetchLimit(375)).toBe(2)
  })

  it('«listo» es readyState ≥ 3 (HAVE_FUTURE_DATA)', () => {
    expect([0, 1, 2].map(isVideoReady)).toEqual([false, false, false])
    expect([3, 4].map(isVideoReady)).toEqual([true, true])
  })

  it('conexión lenta: downlink por debajo de 1,5 Mbps; sin dato o 0, no se asume lenta', () => {
    expect(isSlowDownlink(1.4)).toBe(true)
    expect(isSlowDownlink(0.5)).toBe(true)
    expect(isSlowDownlink(1.5)).toBe(false)
    expect(isSlowDownlink(10)).toBe(false)
    expect(isSlowDownlink(undefined)).toBe(false)
    expect(isSlowDownlink(0)).toBe(false)
  })
})

describe('ciclo de carga del vídeo (§6.3 y §6.5)', () => {
  it('empieza cargando, sin reintentos', () => {
    expect(INITIAL_VIDEO_LOAD_STATE).toEqual({ phase: 'loading', attempt: 0 })
  })

  it('cargando + listo → listo', () => {
    expect(run(['ready'])).toEqual({ phase: 'ready', attempt: 0 })
  })

  it('cargando + tiempo máximo → se rinde (se queda el póster), SIN reintentar', () => {
    const state = run(['timeout'])

    expect(state.phase).toBe('gaveup')
    expect(nextRetryDelay(state)).toBeNull()
  })

  it('un error espera 3 s, reintenta, y un segundo error espera 8 s', () => {
    const afterFirstError = run(['error'])

    expect(afterFirstError).toEqual({ phase: 'retrying', attempt: 0 })
    expect(nextRetryDelay(afterFirstError)).toBe(3_000)

    const retried = run(['error', 'retry'])

    expect(retried).toEqual({ phase: 'loading', attempt: 1 })

    const afterSecondError = run(['error', 'retry', 'error'])

    expect(afterSecondError).toEqual({ phase: 'retrying', attempt: 1 })
    expect(nextRetryDelay(afterSecondError)).toBe(8_000)
  })

  it('tras dos reintentos fallidos se rinde: como máximo 3 intentos en total', () => {
    const state = run(['error', 'retry', 'error', 'retry', 'error'])

    expect(state).toEqual({ phase: 'gaveup', attempt: 2 })
    expect(nextRetryDelay(state)).toBeNull()
  })

  it('un reintento que sale bien llega a listo con el contador de intentos', () => {
    expect(run(['error', 'retry', 'ready'])).toEqual({
      phase: 'ready',
      attempt: 1,
    })
  })

  it('un «listo» tardío tras rendirse o mientras espera reintento no resucita un vídeo que ya no existe', () => {
    expect(run(['timeout', 'ready']).phase).toBe('gaveup')
    expect(run(['error', 'ready']).phase).toBe('retrying')
  })

  it('un «tiempo máximo» tardío cuando ya está listo no lo tira', () => {
    expect(run(['ready', 'timeout']).phase).toBe('ready')
  })

  it('un error DESPUÉS de estar listo (p. ej. fallo de decodificación) también reintenta', () => {
    expect(run(['ready', 'error']).phase).toBe('retrying')
  })

  it('«retry» solo tiene efecto mientras se espera un reintento', () => {
    expect(run(['retry'])).toEqual(INITIAL_VIDEO_LOAD_STATE)
    expect(run(['ready', 'retry']).phase).toBe('ready')
  })

  it('«reset» vuelve al principio desde cualquier estado (se perdió el billete)', () => {
    for (const events of [
      ['ready'],
      ['timeout'],
      ['error'],
      ['error', 'retry', 'error', 'retry', 'error'],
    ] as VideoLoadEvent[][]) {
      expect(run([...events, 'reset'])).toEqual(INITIAL_VIDEO_LOAD_STATE)
    }
  })

  it('terminación: ninguna secuencia de eventos produce más de 3 intentos', () => {
    const events: VideoLoadEvent[] = ['error', 'retry']
    let state = INITIAL_VIDEO_LOAD_STATE

    for (let i = 0; i < 50; i++) {
      state = videoLoadReducer(state, events[i % 2])
    }

    expect(state.attempt).toBeLessThanOrEqual(RETRY_DELAYS_MS.length)
  })
})

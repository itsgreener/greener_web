// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useVideoLoadLifecycle } from '@/modules/media/client/useVideoLoadLifecycle'
import { READY_TIMEOUT_MS } from '@/modules/media/domain/videoPlayback'

/**
 * El ciclo de carga que comparten `usePinVideo` y `useToolCoverVideo` (PUB-B1
 * de la auditoría TSX). La política exacta está probada en
 * `videoPlayback.test.ts`; aquí se prueba que el hook la conecta bien: tiempo
 * máximo, reintentos, soltar el elemento y los manejadores del `<video>`.
 */
type Params = Parameters<typeof useVideoLoadLifecycle>[0]

function setup(overrides: Partial<Params> = {}) {
  const video = document.createElement('video')

  vi.spyOn(video, 'pause').mockImplementation(() => {})
  vi.spyOn(video, 'load').mockImplementation(() => {})

  const videoRef = { current: video }

  const hook = renderHook((props: Partial<Params>) =>
    useVideoLoadLifecycle({
      wanted: true,
      resetKey: 'a',
      sourceCount: 2,
      videoRef,
      ...overrides,
      ...props,
    }),
  )

  return { ...hook, video }
}

function videoEvent(
  target: unknown,
  currentTarget: unknown,
): React.SyntheticEvent<HTMLVideoElement> {
  return { target, currentTarget } as React.SyntheticEvent<HTMLVideoElement>
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useVideoLoadLifecycle — montaje y tiempo máximo', () => {
  it('empieza cargando y montado si se quiere', () => {
    const { result } = setup()

    expect(result.current.load).toEqual({ phase: 'loading', attempt: 0 })
    expect(result.current.mounted).toBe(true)
  })

  it('sin `wanted` no se monta', () => {
    const { result } = setup({ wanted: false })

    expect(result.current.mounted).toBe(false)
  })

  it('si no está listo a tiempo, se rinde y deja de montarse', () => {
    const { result } = setup()

    act(() => {
      vi.advanceTimersByTime(READY_TIMEOUT_MS)
    })

    expect(result.current.load.phase).toBe('gaveup')
    expect(result.current.mounted).toBe(false)
  })

  it('no se rinde antes de tiempo', () => {
    const { result } = setup()

    act(() => {
      vi.advanceTimersByTime(READY_TIMEOUT_MS - 1)
    })

    expect(result.current.load.phase).toBe('loading')
  })

  it('con `loadRequested={false}` el tiempo máximo no corre (preload none)', () => {
    const { result } = setup({ loadRequested: false })

    act(() => {
      vi.advanceTimersByTime(READY_TIMEOUT_MS * 3)
    })

    expect(result.current.load.phase).toBe('loading')
    expect(result.current.mounted).toBe(true)
  })

  it('si llega a estar listo antes, el tiempo máximo ya no lo rinde', () => {
    const { result } = setup()

    act(() => {
      result.current.handlers.onCanPlay(videoEvent(null, { readyState: 4 }))
      vi.advanceTimersByTime(READY_TIMEOUT_MS * 2)
    })

    expect(result.current.load.phase).toBe('ready')
  })
})

describe('useVideoLoadLifecycle — errores y reintentos', () => {
  it('un error espera 3 s, vuelve a cargar con attempt 1 y a los 8 s con attempt 2', () => {
    const { result } = setup()

    act(() => result.current.dispatch('error'))
    expect(result.current.load).toEqual({ phase: 'retrying', attempt: 0 })
    expect(result.current.mounted).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2_999)
    })
    expect(result.current.load.phase).toBe('retrying')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.load).toEqual({ phase: 'loading', attempt: 1 })
    expect(result.current.mounted).toBe(true)

    act(() => result.current.dispatch('error'))
    act(() => {
      vi.advanceTimersByTime(8_000)
    })
    expect(result.current.load).toEqual({ phase: 'loading', attempt: 2 })
  })

  it('tras dos reintentos, el siguiente error es definitivo', () => {
    const { result } = setup()

    for (const delay of [3_000, 8_000]) {
      act(() => result.current.dispatch('error'))
      act(() => {
        vi.advanceTimersByTime(delay)
      })
    }

    act(() => result.current.dispatch('error'))

    expect(result.current.load.phase).toBe('gaveup')
  })
})

describe('useVideoLoadLifecycle — manejadores', () => {
  it('onCanPlay solo marca «listo» con datos suficientes (readyState ≥ 3)', () => {
    const { result } = setup()

    act(() =>
      result.current.handlers.onCanPlay(videoEvent(null, { readyState: 2 })),
    )
    expect(result.current.load.phase).toBe('loading')

    act(() =>
      result.current.handlers.onCanPlay(videoEvent(null, { readyState: 3 })),
    )
    expect(result.current.load.phase).toBe('ready')
  })

  it('onVideoError ignora el error burbujeado de un <source> y cuenta el del propio vídeo', () => {
    const { result } = setup()
    const videoEl = document.createElement('video')
    const sourceEl = document.createElement('source')

    act(() =>
      result.current.handlers.onVideoError(videoEvent(sourceEl, videoEl)),
    )
    expect(result.current.load.phase).toBe('loading')

    act(() =>
      result.current.handlers.onVideoError(videoEvent(videoEl, videoEl)),
    )
    expect(result.current.load.phase).toBe('retrying')
  })

  it('onSourceError solo cuenta el del último <source>', () => {
    const { result } = setup({ sourceCount: 2 })

    act(() => result.current.handlers.onSourceError(0))
    expect(result.current.load.phase).toBe('loading')

    act(() => result.current.handlers.onSourceError(1))
    expect(result.current.load.phase).toBe('retrying')
  })
})

describe('useVideoLoadLifecycle — soltar el elemento', () => {
  it('al desmontar el hook suelta el <video> (pausa y load)', () => {
    const { unmount, video } = setup()

    expect(video.pause).not.toHaveBeenCalled()

    unmount()

    expect(video.pause).toHaveBeenCalled()
    expect(video.load).toHaveBeenCalled()
  })

  it('al dejar de quererse (billete perdido) suelta el <video>', () => {
    const { rerender, video } = setup()

    rerender({ wanted: false })

    expect(video.pause).toHaveBeenCalled()
    expect(video.load).toHaveBeenCalled()
  })

  it('un reintento también suelta el <video> anterior', () => {
    const { result, video } = setup()

    act(() => result.current.dispatch('error'))

    expect(video.load).toHaveBeenCalled()
  })

  it('sin montar no toca el elemento', () => {
    const { unmount, video } = setup({ wanted: false })

    unmount()

    expect(video.pause).not.toHaveBeenCalled()
  })
})

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { safePause, safePlay } from '@/modules/media/client/safePlayback'

/**
 * `play()`/`pause()` que no rompen ni en jsdom ni con el autoplay bloqueado
 * (PUB-B1 de la auditoría TSX): comparten `usePinVideo` y `useToolCoverVideo`.
 */
function fakeVideo(overrides: Partial<HTMLVideoElement> = {}) {
  return {
    muted: false,
    currentTime: 0,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    ...overrides,
  } as unknown as HTMLVideoElement
}

describe('safePlay', () => {
  it('silencia el vídeo (como propiedad) y lo reproduce', () => {
    const el = fakeVideo()

    safePlay(el)

    expect(el.muted).toBe(true)
    expect(el.play).toHaveBeenCalledTimes(1)
  })

  it('con restart vuelve al principio solo si ya había avanzado', () => {
    const advanced = fakeVideo({ currentTime: 4.2 })
    const fresh = fakeVideo({ currentTime: 0 })

    safePlay(advanced, { restart: true })
    safePlay(fresh, { restart: true })

    expect(advanced.currentTime).toBe(0)
    expect(fresh.currentTime).toBe(0)
  })

  it('sin restart no toca la posición', () => {
    const el = fakeVideo({ currentTime: 4.2 })

    safePlay(el)

    expect(el.currentTime).toBe(4.2)
  })

  it('un autoplay bloqueado (promesa rechazada) no lanza ni deja una promesa sin capturar', async () => {
    const el = fakeVideo({
      play: vi.fn(() => Promise.reject(new Error('NotAllowedError'))),
    })

    expect(() => safePlay(el)).not.toThrow()

    // Deja correr la promesa rechazada: si no estuviera capturada, vitest
    // fallaría la suite con «unhandled rejection».
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('un play() que lanza de forma síncrona (jsdom) no rompe', () => {
    const el = fakeVideo({
      play: vi.fn(() => {
        throw new Error('Not implemented')
      }),
    })

    expect(() => safePlay(el)).not.toThrow()
  })

  it('un play() sin promesa (undefined) tampoco rompe', () => {
    const el = fakeVideo({ play: vi.fn(() => undefined) as never })

    expect(() => safePlay(el)).not.toThrow()
  })

  it('sin elemento no hace nada', () => {
    expect(() => safePlay(null)).not.toThrow()
    expect(() => safePlay(undefined)).not.toThrow()
  })
})

describe('safePause', () => {
  it('pausa el vídeo', () => {
    const el = fakeVideo()

    safePause(el)

    expect(el.pause).toHaveBeenCalledTimes(1)
  })

  it('un pause() que lanza no rompe', () => {
    const el = fakeVideo({
      pause: vi.fn(() => {
        throw new Error('Not implemented')
      }),
    })

    expect(() => safePause(el)).not.toThrow()
  })

  it('sin elemento no hace nada', () => {
    expect(() => safePause(null)).not.toThrow()
  })
})

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { videoPlaybackCoordinator } from '@/components/pin/videoPlaybackCoordinator'
import { useVideoSlot } from '@/components/pin/useVideoSlot'

/**
 * PUB-B6 (auditoría TSX), lote 1: `useVideoSlot` ya no reinicia su estado con
 * `queueMicrotask`. Deshabilitado devuelve `false` en el mismo render, y al
 * soltar el hueco se olvida el «activo» anterior.
 */

type Observer = { cb: IntersectionObserverCallback; disconnected: boolean }
let observers: Observer[] = []

function fire(ratio: number) {
  const entry = {
    intersectionRatio: ratio,
    isIntersecting: ratio > 0,
    boundingClientRect: { top: 0, bottom: 100 },
  } as unknown as IntersectionObserverEntry

  act(() => {
    for (const observer of observers) {
      if (!observer.disconnected) observer.cb([entry], {} as never)
    }
  })
}

function setup(enabled: boolean) {
  // Ref estable, como el de un componente real (un objeto nuevo en cada render
  // reiniciaría el efecto).
  const ref = { current: document.createElement('div') }

  return renderHook(({ on }) => useVideoSlot('slot-a', ref, on), {
    initialProps: { on: enabled },
  })
}

beforeEach(() => {
  observers = []

  global.IntersectionObserver = class {
    private readonly entry: Observer

    constructor(cb: IntersectionObserverCallback) {
      this.entry = { cb, disconnected: false }
      observers.push(this.entry)
    }
    observe() {}
    unobserve() {}
    takeRecords() {
      return []
    }
    disconnect() {
      this.entry.disconnected = true
    }
  } as unknown as typeof IntersectionObserver
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useVideoSlot', () => {
  it('deshabilitado no observa nada y devuelve false', () => {
    const hook = setup(false)

    expect(hook.result.current).toBe(false)
    expect(observers).toHaveLength(0)
  })

  it('habilitado y visible, consigue el hueco', () => {
    const hook = setup(true)

    expect(hook.result.current).toBe(false)

    fire(1)

    expect(hook.result.current).toBe(true)
  })

  it('al deshabilitarse devuelve false en ese mismo render, sin esperar a un microtask', () => {
    const hook = setup(true)
    fire(1)
    expect(hook.result.current).toBe(true)

    hook.rerender({ on: false })

    expect(hook.result.current).toBe(false)
  })

  it('al volver a habilitarse no reaparece el «activo» anterior antes de medir', () => {
    const hook = setup(true)
    fire(1)
    expect(hook.result.current).toBe(true)

    hook.rerender({ on: false })
    hook.rerender({ on: true })

    // El observer nuevo aún no ha medido nada.
    expect(hook.result.current).toBe(false)

    fire(1)

    expect(hook.result.current).toBe(true)
  })

  it('al desmontar se da de baja del coordinador y suelta el observer', () => {
    const unregister = vi.fn()
    vi.spyOn(videoPlaybackCoordinator, 'register').mockReturnValue(unregister)

    const hook = setup(true)
    hook.unmount()

    expect(unregister).toHaveBeenCalledTimes(1)
    expect(observers.every((observer) => observer.disconnected)).toBe(true)
  })
})

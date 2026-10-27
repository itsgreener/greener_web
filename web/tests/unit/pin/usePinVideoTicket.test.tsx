// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { usePinVideo } from '@/components/pin/usePinVideo'

/**
 * PUB-B6 (auditoría TSX), lote 1: el billete de prefetch de `usePinVideo` ya
 * no se suelta con `queueMicrotask`: se pierde al limpiar el efecto. Aquí se
 * comprueba con el `<video>` montado solo por el billete (`wantsPlay` falso).
 */

type Observer = { cb: IntersectionObserverCallback; disconnected: boolean }
let observers: Observer[] = []

function fireAll() {
  const entry = {
    intersectionRatio: 1,
    isIntersecting: true,
    boundingClientRect: { top: 0, bottom: 100 },
  } as unknown as IntersectionObserverEntry

  act(() => {
    for (const observer of observers) {
      if (!observer.disconnected) observer.cb([entry], {} as never)
    }
  })
}

function setup(prefetchEnabled: boolean) {
  // Refs estables, como los de un componente real.
  const cardRef = { current: document.createElement('div') }
  const videoRef = { current: null }

  return renderHook(
    ({ prefetch }) =>
      usePinVideo({
        id: 'pin-ticket',
        cardRef,
        videoRef,
        resetKey: 'v1',
        sourceCount: 2,
        prefetchEnabled: prefetch,
        wantsPlay: false,
      }),
    { initialProps: { prefetch: prefetchEnabled } },
  )
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

describe('usePinVideo — billete de prefetch', () => {
  it('sin prefetch no monta el vídeo ni observa nada', () => {
    const hook = setup(false)

    expect(hook.result.current.mounted).toBe(false)
    expect(observers).toHaveLength(0)
  })

  it('con prefetch y cerca del viewport consigue billete y monta el vídeo oculto', () => {
    const hook = setup(true)

    expect(hook.result.current.mounted).toBe(false)

    fireAll()

    expect(hook.result.current.mounted).toBe(true)
    expect(hook.result.current.visible).toBe(false)
  })

  it('al deshabilitar el prefetch el vídeo se desmonta en ese mismo render', () => {
    const hook = setup(true)
    fireAll()
    expect(hook.result.current.mounted).toBe(true)

    hook.rerender({ prefetch: false })

    expect(hook.result.current.mounted).toBe(false)
  })

  it('al volver a habilitarlo no reaparece el billete anterior antes de medir', () => {
    const hook = setup(true)
    fireAll()
    expect(hook.result.current.mounted).toBe(true)

    hook.rerender({ prefetch: false })
    hook.rerender({ prefetch: true })

    expect(hook.result.current.mounted).toBe(false)

    fireAll()

    expect(hook.result.current.mounted).toBe(true)
  })
})

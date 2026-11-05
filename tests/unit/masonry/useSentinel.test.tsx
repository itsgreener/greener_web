// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSentinel } from '@/components/masonry/useSentinel'

/**
 * El aviso del observer puede llegar viejo: al volver de un detalle el
 * contenedor del feed aún mide 0 de alto en el primer fotograma, el sentinel
 * queda arriba y el observer lo anota «a la vista»; cuando el aviso llega, el
 * layout ya lo ha bajado al final. Los tests E2E (E4) lo detectaron: se pedía
 * un lote al volver que nadie necesitaba.
 */

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void

let callback: ObserverCallback | null = null

class FakeIntersectionObserver {
  constructor(cb: ObserverCallback) {
    callback = cb
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

const VIEWPORT = 800
// Colchón: 2 viewports, con suelo de 1200 px.
const MARGIN = 1600

function sentinelAt(top: number): HTMLElement {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ top }) as DOMRect
  return el
}

function mountWith(top: number) {
  const onVisible = vi.fn()
  const { result } = renderHook(() => useSentinel(onVisible))
  act(() => result.current(sentinelAt(top)))
  return onVisible
}

beforeEach(() => {
  callback = null
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  Object.defineProperty(window, 'innerHeight', {
    value: VIEWPORT,
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useSentinel', () => {
  it('avisa si el sentinel está dentro del colchón', () => {
    const onVisible = mountWith(VIEWPORT + MARGIN - 1)
    callback?.([{ isIntersecting: true }])

    expect(onVisible).toHaveBeenCalledTimes(1)
  })

  it('ignora un aviso viejo: el sentinel ya está fuera del colchón', () => {
    const onVisible = mountWith(VIEWPORT + MARGIN + 1)
    callback?.([{ isIntersecting: true }])

    expect(onVisible).not.toHaveBeenCalled()
  })

  it('no avisa si el observer dice que no intersecta', () => {
    const onVisible = mountWith(0)
    callback?.([{ isIntersecting: false }])

    expect(onVisible).not.toHaveBeenCalled()
  })

  it('con varias entradas manda la última', () => {
    const onVisible = mountWith(0)
    callback?.([{ isIntersecting: true }, { isIntersecting: false }])

    expect(onVisible).not.toHaveBeenCalled()

    callback?.([{ isIntersecting: false }, { isIntersecting: true }])

    expect(onVisible).toHaveBeenCalledTimes(1)
  })
})

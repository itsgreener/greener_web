// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useViewportHeight } from '@/components/masonry/useViewportHeight'

const original = window.innerHeight

function setHeight(value: number) {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value,
  })
}

describe('useViewportHeight', () => {
  afterEach(() => setHeight(original))

  it('devuelve el alto actual de la ventana', () => {
    setHeight(800)

    const { result } = renderHook(() => useViewportHeight())

    expect(result.current).toBe(800)
  })

  it('se actualiza al redimensionar', () => {
    setHeight(800)
    const { result } = renderHook(() => useViewportHeight())

    act(() => {
      setHeight(500)
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(500)
  })

  it('al desmontar deja de escuchar el resize', () => {
    const { unmount } = renderHook(() => useViewportHeight())
    const spy = { removed: 0 }
    const remove = window.removeEventListener.bind(window)
    window.removeEventListener = ((type: string, ...rest: unknown[]) => {
      if (type === 'resize') spy.removed += 1
      return (remove as (...args: unknown[]) => void)(type, ...rest)
    }) as typeof window.removeEventListener

    unmount()
    window.removeEventListener = remove

    expect(spy.removed).toBe(1)
  })
})

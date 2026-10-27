// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useFeedScroll } from '@/components/masonry/Feed/useFeedScroll'

function setup(options: { hadItemsOnMount: boolean; ready: boolean }) {
  const setScrollY = vi.fn()
  const getScrollY = vi.fn(() => 640)
  const hook = renderHook(
    (props: { ready: boolean }) =>
      useFeedScroll('work', {
        setScrollY,
        getScrollY,
        hadItemsOnMount: options.hadItemsOnMount,
        ready: props.ready,
      }),
    { initialProps: { ready: options.ready } },
  )
  return { ...hook, setScrollY, getScrollY }
}

describe('useFeedScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.scrollTo = vi.fn() as typeof window.scrollTo
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('guardar', () => {
    it('anota la posición tras un scroll, una vez por frame', () => {
      const { setScrollY } = setup({ hadItemsOnMount: false, ready: false })

      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 300,
      })
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(50)

      expect(setScrollY).toHaveBeenCalledTimes(1)
      expect(setScrollY).toHaveBeenCalledWith('work', 300)
    })

    it('al desmontar deja de escuchar el scroll', () => {
      const { setScrollY, unmount } = setup({
        hadItemsOnMount: false,
        ready: false,
      })

      unmount()
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(50)

      expect(setScrollY).not.toHaveBeenCalled()
    })
  })

  describe('restaurar', () => {
    it('con pines previos, salta a la posición guardada en cuanto hay altura', () => {
      const { rerender } = setup({ hadItemsOnMount: true, ready: false })
      expect(window.scrollTo).not.toHaveBeenCalled()

      rerender({ ready: true })

      expect(window.scrollTo).toHaveBeenCalledTimes(1)
      expect(window.scrollTo).toHaveBeenCalledWith(0, 640)
    })

    it('restaura una sola vez', () => {
      const { rerender } = setup({ hadItemsOnMount: true, ready: true })

      rerender({ ready: true })
      rerender({ ready: false })
      rerender({ ready: true })

      expect(window.scrollTo).toHaveBeenCalledTimes(1)
    })

    it('si el feed estaba vacío al montar (primera visita), no restaura', () => {
      const { rerender } = setup({ hadItemsOnMount: false, ready: false })

      rerender({ ready: true })

      expect(window.scrollTo).not.toHaveBeenCalled()
    })
  })
})

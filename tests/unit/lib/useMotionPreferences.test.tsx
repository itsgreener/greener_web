// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  readReducedMotion,
  readSaveData,
  readSlowConnection,
  useMotionPreferences,
} from '@/lib/useMotionPreferences'

type Listener = () => void

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>()
  const mql = {
    matches,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  }
  window.matchMedia = vi.fn().mockReturnValue(mql)

  return {
    set(next: boolean) {
      mql.matches = next
      listeners.forEach((l) => l())
    },
  }
}

function mockConnection(connection: object | undefined) {
  Object.defineProperty(navigator, 'connection', {
    value: connection,
    configurable: true,
  })
}

afterEach(() => {
  mockConnection(undefined)
})

describe('useMotionPreferences (5 oct 2026, arquitectura §9.3)', () => {
  it('sin preferencias, el autoplay está permitido', () => {
    mockMatchMedia(false)

    const { result } = renderHook(() => useMotionPreferences())

    expect(result.current).toEqual({
      reducedMotion: false,
      saveData: false,
      slowConnection: false,
      autoplayAllowed: true,
      feedAutoplayAllowed: true,
    })
  })

  it('prefers-reduced-motion desactiva el autoplay', () => {
    mockMatchMedia(true)

    const { result } = renderHook(() => useMotionPreferences())

    expect(result.current.reducedMotion).toBe(true)
    expect(result.current.autoplayAllowed).toBe(false)
  })

  it('save-data desactiva el autoplay', () => {
    mockMatchMedia(false)
    mockConnection({ saveData: true })

    const { result } = renderHook(() => useMotionPreferences())

    expect(result.current.saveData).toBe(true)
    expect(result.current.autoplayAllowed).toBe(false)
  })

  it.each(['slow-2g', '2g'])(
    'conexión %s cuenta como «todo vídeo requiere interacción»',
    (effectiveType) => {
      mockMatchMedia(false)
      mockConnection({ effectiveType })

      expect(readSaveData()).toBe(true)
    },
  )

  it.each(['3g', '4g'])('conexión %s no restringe', (effectiveType) => {
    mockMatchMedia(false)
    mockConnection({ effectiveType, saveData: false })

    expect(readSaveData()).toBe(false)
  })

  it('un navegador sin Network Information API (Safari, Firefox) no restringe', () => {
    mockMatchMedia(false)
    mockConnection(undefined)

    expect(readSaveData()).toBe(false)
  })

  it('un entorno sin matchMedia no rompe', () => {
    // @ts-expect-error -- simula un entorno sin matchMedia
    window.matchMedia = undefined

    expect(readReducedMotion()).toBe(false)
  })

  describe('conexión lenta (contrato de medios §6.4, 7 oct 2026)', () => {
    it('downlink por debajo de 1,5 Mbps es conexión lenta; desde 1,5 no', () => {
      mockMatchMedia(false)

      mockConnection({ downlink: 1.4 })
      expect(readSlowConnection()).toBe(true)

      mockConnection({ downlink: 1.5 })
      expect(readSlowConnection()).toBe(false)

      mockConnection({ downlink: 10 })
      expect(readSlowConnection()).toBe(false)
    })

    it('sin downlink (Safari, Firefox) no se asume lenta', () => {
      mockMatchMedia(false)

      mockConnection(undefined)
      expect(readSlowConnection()).toBe(false)

      mockConnection({})
      expect(readSlowConnection()).toBe(false)
    })

    it('una conexión lenta quita el autoplay del FEED, pero NO el de la ficha de tool', () => {
      mockMatchMedia(false)
      mockConnection({ downlink: 0.8 })

      const { result } = renderHook(() => useMotionPreferences())

      expect(result.current.slowConnection).toBe(true)
      expect(result.current.feedAutoplayAllowed).toBe(false)
      // La ficha reproduce igualmente (con su póster hasta que esté listo).
      expect(result.current.autoplayAllowed).toBe(true)
    })

    it('reduced-motion y save-data quitan también el autoplay del feed', () => {
      mockMatchMedia(true)
      const reduced = renderHook(() => useMotionPreferences())

      expect(reduced.result.current.feedAutoplayAllowed).toBe(false)

      mockMatchMedia(false)
      mockConnection({ saveData: true })
      const save = renderHook(() => useMotionPreferences())

      expect(save.result.current.feedAutoplayAllowed).toBe(false)
    })
  })

  it('reacciona si el usuario activa reduced-motion con la página abierta', () => {
    const media = mockMatchMedia(false)

    const { result } = renderHook(() => useMotionPreferences())

    expect(result.current.autoplayAllowed).toBe(true)

    act(() => media.set(true))

    expect(result.current.autoplayAllowed).toBe(false)
  })
})

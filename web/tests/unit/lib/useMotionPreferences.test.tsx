// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  readReducedMotion,
  readSaveData,
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
      autoplayAllowed: true,
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

  it('reacciona si el usuario activa reduced-motion con la página abierta', () => {
    const media = mockMatchMedia(false)

    const { result } = renderHook(() => useMotionPreferences())

    expect(result.current.autoplayAllowed).toBe(true)

    act(() => media.set(true))

    expect(result.current.autoplayAllowed).toBe(false)
  })
})

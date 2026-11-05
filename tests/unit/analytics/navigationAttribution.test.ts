// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  consumeNavigationSource,
  rememberNavigationSource,
} from '@/modules/analytics/navigationAttribution'

describe('navigationAttribution', () => {
  beforeEach(() => {
    // Vacía cualquier atribución pendiente que haya dejado un test anterior.
    consumeNavigationSource()
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('guarda y recupera la sección para el destino correcto', () => {
    rememberNavigationSource('/work/caso-1', 'home')
    window.history.replaceState({}, '', '/work/caso-1')

    expect(consumeNavigationSource()).toBe('home')
  })

  it('devuelve "direct" cuando no hay ninguna atribución guardada', () => {
    window.history.replaceState({}, '', '/work/caso-1')

    expect(consumeNavigationSource()).toBe('direct')
  })

  it('no atribuye una navegación a una página distinta de la guardada', () => {
    rememberNavigationSource('/work/caso-1', 'home')
    window.history.replaceState({}, '', '/tools/otra-tool')

    expect(consumeNavigationSource()).toBe('direct')
  })

  it('se consume una sola vez: la segunda lectura ya es "direct"', () => {
    rememberNavigationSource('/work/caso-1', 'recommendations')
    window.history.replaceState({}, '', '/work/caso-1')

    expect(consumeNavigationSource()).toBe('recommendations')
    expect(consumeNavigationSource()).toBe('direct')
  })

  it('descarta una atribución más vieja que 30 minutos', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-29T10:00:00Z'))

    rememberNavigationSource('/work/caso-1', 'home')
    window.history.replaceState({}, '', '/work/caso-1')

    vi.setSystemTime(new Date('2026-09-29T10:31:00Z'))

    expect(consumeNavigationSource()).toBe('direct')

    vi.useRealTimers()
  })

  it('un destino sin barra inicial se normaliza igual que uno absoluto (window.location.origin como base)', () => {
    rememberNavigationSource('work/caso-1', 'home')
    window.history.replaceState({}, '', '/work/caso-1')

    expect(consumeNavigationSource()).toBe('home')
  })

  it('no escribe nada en sessionStorage ni en localStorage ni en cookies', () => {
    rememberNavigationSource('/work/caso-1', 'home')

    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })

  it('ignora lo que haya en sessionStorage: solo cuenta la memoria', () => {
    window.sessionStorage.setItem(
      'greener:analytics:navigation-source',
      JSON.stringify({
        destinationPath: '/work/caso-1',
        section: 'home',
        createdAt: Date.now(),
      }),
    )
    window.history.replaceState({}, '', '/work/caso-1')

    expect(consumeNavigationSource()).toBe('direct')
  })

  it('una sección en blanco no se guarda', () => {
    rememberNavigationSource('/work/caso-1', '   ')
    window.history.replaceState({}, '', '/work/caso-1')

    expect(consumeNavigationSource()).toBe('direct')
  })
})

// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PinCardData } from '@/components/pin/PinCard'
import { useMasonryPositions } from '@/components/masonry/useMasonryPositions'

const CONTAINER_WIDTH = 1329
const VIEWPORT_HEIGHT = 800
/** Distancia del contenedor al principio del documento (menú auxiliar, etc.). */
const CONTAINER_TOP = 100

const container = document.createElement('div')

// El ancho lo da un ResizeObserver que jsdom no tiene: se fija aquí.
vi.mock('@/components/masonry/useContainerWidth', () => ({
  useContainerWidth: () => ({
    containerRef: { current: container },
    containerWidth: CONTAINER_WIDTH,
  }),
}))

const BATCHES = 30
const BATCH_SIZE = 40

function makeItems(count: number): PinCardData[] {
  const ratios = ['1:1', '4:5', '2:3', '9:16', '16:9', '4:3'] as const

  return Array.from({ length: count }, (_, i) => ({
    pinId: `pin-${i}`,
    contentId: `content-${i}`,
    kind: 'case',
    destination: `/work/case-${i}`,
    ratio: ratios[(i * 7) % ratios.length],
    label: 'Gancho corto',
    cta: 'Watch',
    alt: 'Pin de prueba',
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: `test/image-${i}` }],
  })) as unknown as PinCardData[]
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  window.dispatchEvent(new Event('scroll'))
}

/** Espera a que corran los `requestAnimationFrame` pendientes. */
async function nextFrames() {
  await act(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
  })
}

describe('useMasonryPositions: lotes montados', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      value: VIEWPORT_HEIGHT,
      configurable: true,
    })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    // La posición del contenedor respecto al viewport depende del scroll.
    container.getBoundingClientRect = () =>
      ({ top: CONTAINER_TOP - window.scrollY }) as DOMRect
  })

  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  it('con 30 lotes cargados, todo pin que se ve en pantalla está montado en cualquier punto del recorrido', async () => {
    const items = makeItems(BATCHES * BATCH_SIZE)
    const batchSizes = Array<number>(BATCHES).fill(BATCH_SIZE)
    const { result } = renderHook(() => useMasonryPositions(items, batchSizes))

    const totalHeight = result.current.totalHeight
    expect(totalHeight).toBeGreaterThan(VIEWPORT_HEIGHT * 20)

    // Puntos repartidos por todo el feed, incluidos los de más allá del lote
    // 12, donde la versión anterior empezaba a dejar espaciadores en pantalla.
    for (const fraction of [0, 0.1, 0.25, 0.4, 0.5, 0.65, 0.8, 0.95, 1]) {
      const scrollY = Math.max(
        0,
        Math.round(fraction * (totalHeight + CONTAINER_TOP - VIEWPORT_HEIGHT)),
      )

      scrollTo(scrollY)
      await nextFrames()

      const viewportTop = scrollY - CONTAINER_TOP
      const inViewport = result.current.positioned.filter(
        (p) =>
          p.y + p.height > viewportTop && p.y < viewportTop + VIEWPORT_HEIGHT,
      )

      expect(inViewport.length).toBeGreaterThan(0)
      expect(
        inViewport.filter((p) => !p.mounted).map((p) => p.key),
        `scrollY ${scrollY} (${Math.round(fraction * 100)} %)`,
      ).toEqual([])

      // Y sigue virtualizando: solo una pequeña parte del feed en el DOM.
      const mounted = result.current.positioned.filter((p) => p.mounted).length
      expect(mounted).toBeLessThan(items.length / 3)
    }
  })

  it('scrollear dentro del mismo rango montado no recalcula ni re-renderiza el feed', async () => {
    const items = makeItems(BATCHES * BATCH_SIZE)
    const batchSizes = Array<number>(BATCHES).fill(BATCH_SIZE)
    const { result } = renderHook(() => useMasonryPositions(items, batchSizes))

    scrollTo(30_000)
    await nextFrames()
    await waitFor(() =>
      expect(result.current.positioned.some((p) => p.mounted)).toBe(true),
    )

    const before = result.current.positioned

    // Cien píxeles de scroll: el mismo conjunto de lotes montados.
    scrollTo(30_100)
    await nextFrames()

    expect(result.current.positioned).toBe(before)
  })
})

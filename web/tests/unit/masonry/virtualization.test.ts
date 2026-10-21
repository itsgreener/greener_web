import { describe, it, expect } from 'vitest'
import {
  computeMasonryLayout,
  type LayoutInputItem,
  type PinRatio,
} from '@/modules/masonry/domain/layout'
import {
  computeBatchBounds,
  computeMountedRange,
  type BatchBounds,
  type PlacedCard,
} from '@/modules/masonry/domain/virtualization'

/** Generador pseudoaleatorio determinista (LCG) para no depender de Math.random. */
function rng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const RATIOS: PinRatio[] = ['1:1', '4:3', '4:5', '3:4', '2:3', '9:16', '16:9']

/** Feed sintético: `batches` lotes de `batchSize` pines con proporciones y rótulos variados. */
function buildFeed(
  batches: number,
  batchSize: number,
  containerWidth: number,
  columns: number,
  seed: number,
) {
  const random = rng(seed)
  const items: LayoutInputItem[] = Array.from(
    { length: batches * batchSize },
    (_, i) => ({
      id: String(i),
      ratio: RATIOS[Math.floor(random() * RATIOS.length)],
      labelHeight: random() < 0.7 ? 45 : 28,
    }),
  )
  const layout = computeMasonryLayout(items, containerWidth, columns)
  const cards: PlacedCard[] = layout.positions.map((position, index) => ({
    y: position.y,
    height: position.height,
    labelHeight: items[index].labelHeight ?? 0,
  }))
  const batchSizes = Array<number>(batches).fill(batchSize)

  return {
    cards,
    batchSizes,
    bounds: computeBatchBounds(cards, batchSizes),
    totalHeight: layout.totalHeight,
  }
}

describe('computeBatchBounds', () => {
  it('cada lote abarca de su pin más alto al borde inferior del más bajo, rótulo incluido', () => {
    const cards: PlacedCard[] = [
      { y: 0, height: 100, labelHeight: 20 },
      { y: 10, height: 300, labelHeight: 30 },
      { y: 400, height: 50, labelHeight: 0 },
    ]

    expect(computeBatchBounds(cards, [2, 1])).toEqual([
      { batchIndex: 0, top: 0, bottom: 340 },
      { batchIndex: 1, top: 400, bottom: 450 },
    ])
  })

  it('un lote vacío no aparece, pero los índices de los demás se conservan', () => {
    const cards: PlacedCard[] = [
      { y: 0, height: 100, labelHeight: 0 },
      { y: 200, height: 100, labelHeight: 0 },
    ]

    expect(
      computeBatchBounds(cards, [1, 0, 1]).map((b) => b.batchIndex),
    ).toEqual([0, 2])
  })

  it('sin lotes no hay franjas', () => {
    expect(computeBatchBounds([], [])).toEqual([])
  })
})

describe('computeMountedRange', () => {
  const bounds: BatchBounds[] = [
    { batchIndex: 0, top: 0, bottom: 1000 },
    { batchIndex: 1, top: 900, bottom: 2000 },
    { batchIndex: 2, top: 1900, bottom: 3000 },
    { batchIndex: 3, top: 2900, bottom: 4000 },
    { batchIndex: 4, top: 3900, bottom: 5000 },
  ]

  it('monta los lotes que cruzan el viewport, solapados incluidos', () => {
    // El viewport 950-1050 toca el final del lote 0 y el principio del 1.
    expect(computeMountedRange(bounds, 950, 1050, 0)).toEqual({
      first: 0,
      last: 1,
    })
  })

  it('el margen añade los lotes cercanos', () => {
    expect(computeMountedRange(bounds, 2400, 2500, 0)).toEqual({
      first: 2,
      last: 2,
    })
    // 600 px de margen: por arriba llega al final del lote 1 (2000 > 1800) y
    // por abajo al principio del 3 (2900 < 3100).
    expect(computeMountedRange(bounds, 2400, 2500, 600)).toEqual({
      first: 1,
      last: 3,
    })
  })

  it('si ningún lote cruza (viewport por encima de la retícula) monta el más cercano', () => {
    expect(computeMountedRange(bounds, -3000, -2000, 0)).toEqual({
      first: 0,
      last: 0,
    })
  })

  it('si ningún lote cruza (viewport por debajo de la retícula) monta el más cercano', () => {
    expect(computeMountedRange(bounds, 9000, 10000, 0)).toEqual({
      first: 4,
      last: 4,
    })
  })

  it('sin lotes devuelve un rango vacío', () => {
    const range = computeMountedRange([], 0, 1000, 500)
    expect(range.first).toBeGreaterThan(range.last)
  })
})

/**
 * Regresión del feed largo: la versión anterior decidía el «lote visible»
 * sumando alturas de lote, pero los lotes se solapan en vertical y la suma se
 * pasaba unos 280-380 px por lote (escritorio, 40 pines). Hacia el lote 12 el
 * lote estimado iba más de dos lotes por detrás del real, y los pines que
 * estaban en pantalla se sustituían por espaciadores vacíos (18 en el
 * viewport en la medición real).
 */
describe('virtualización con feeds largos', () => {
  const SCENARIOS = [
    {
      name: 'escritorio (6 columnas, lote de 40)',
      width: 1840,
      columns: 6,
      batchSize: 40,
      viewport: 1000,
    },
    {
      name: 'portátil (6 columnas estrechas, lote de 40)',
      width: 1329,
      columns: 6,
      batchSize: 40,
      viewport: 800,
    },
    {
      name: 'tablet (3 columnas, lote de 40)',
      width: 800,
      columns: 3,
      batchSize: 40,
      viewport: 1100,
    },
    {
      name: 'móvil (2 columnas, lote de 20)',
      width: 358,
      columns: 2,
      batchSize: 20,
      viewport: 750,
    },
  ]

  for (const scenario of SCENARIOS) {
    it(`ningún pin del viewport queda sin montar en ${scenario.name}, con 40 lotes`, () => {
      for (const seed of [1, 2, 3]) {
        const feed = buildFeed(
          40,
          scenario.batchSize,
          scenario.width,
          scenario.columns,
          seed,
        )
        const margin = scenario.viewport * 2

        for (
          let scrollY = 0;
          scrollY <= feed.totalHeight - scenario.viewport;
          scrollY += 40
        ) {
          const range = computeMountedRange(
            feed.bounds,
            scrollY,
            scrollY + scenario.viewport,
            margin,
          )

          let index = 0
          for (let b = 0; b < feed.batchSizes.length; b++) {
            for (let k = 0; k < feed.batchSizes[b]; k++, index++) {
              const card = feed.cards[index]
              const inViewport =
                card.y + card.height + card.labelHeight > scrollY &&
                card.y < scrollY + scenario.viewport

              if (inViewport) {
                expect(
                  b >= range.first && b <= range.last,
                  `seed ${seed}, scrollY ${scrollY}: el pin ${index} (lote ${b}) está en pantalla y su lote no se monta (${range.first}-${range.last})`,
                ).toBe(true)
              }
            }
          }
        }
      }
    })

    it(`sigue virtualizando (no monta todo) en ${scenario.name}, con 40 lotes`, () => {
      const feed = buildFeed(
        40,
        scenario.batchSize,
        scenario.width,
        scenario.columns,
        7,
      )
      const margin = scenario.viewport * 2
      let maxMounted = 0

      for (
        let scrollY = 0;
        scrollY <= feed.totalHeight - scenario.viewport;
        scrollY += 200
      ) {
        const { first, last } = computeMountedRange(
          feed.bounds,
          scrollY,
          scrollY + scenario.viewport,
          margin,
        )
        maxMounted = Math.max(maxMounted, last - first + 1)
      }

      // De 40 lotes cargados, nunca más de una pequeña parte en el DOM.
      expect(maxMounted).toBeLessThanOrEqual(8)
    })
  }

  it('el rango montado sigue al scroll hasta el último lote', () => {
    const feed = buildFeed(30, 40, 1840, 6, 5)
    const scrollY = feed.totalHeight - 1000
    const { last } = computeMountedRange(
      feed.bounds,
      scrollY,
      scrollY + 1000,
      2000,
    )

    expect(last).toBe(29)
  })
})

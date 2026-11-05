import { describe, it, expect } from 'vitest'

import {
  computeMasonryLayout,
  GAP,
  type LayoutInputItem,
} from '@/modules/masonry/domain/layout'

// Cinco pines 1:1 de sobra para ver cómo se reparten entre columnas.
const ITEMS: LayoutInputItem[] = Array.from({ length: 5 }, (_, i) => ({
  id: `pin-${i}`,
  ratio: '1:1',
}))

describe('computeMasonryLayout — sin initialColumnHeights (compatibilidad)', () => {
  it('sin el parámetro, se comporta igual que con todas las columnas a 0', () => {
    const withoutParam = computeMasonryLayout(ITEMS, 1200, 3)
    const withZeros = computeMasonryLayout(ITEMS, 1200, 3, [0, 0, 0])

    expect(withoutParam).toEqual(withZeros)
  })
})

describe('computeMasonryLayout — initialColumnHeights (especificacion-final-formato-detalle.md §2)', () => {
  it('rellena primero las columnas sembradas más bajas', () => {
    // Columna 0 (contenido) ya "ocupada" hasta 500px; columnas 1 y 2
    // (recomendación) arrancan a 0 — deben llenarse antes que la 0.
    const { positions } = computeMasonryLayout(ITEMS, 900, 3, [500, 0, 0])

    const firstTwo = positions.slice(0, 2)
    expect(firstTwo.every((p) => p.column !== 0)).toBe(true)
  })

  it('una columna sembrada solo recibe un item una vez que su altura acumulada alcanza a las demás', () => {
    const { positions } = computeMasonryLayout(ITEMS, 900, 3, [500, 0, 0])

    const inSeededColumn = positions.find((p) => p.column === 0)
    expect(inSeededColumn).toBeDefined()
    // Ningún pin se coloca en la columna 0 por debajo de su altura de
    // siembra: el primero que le toca arranca exactamente en y=500.
    expect(inSeededColumn!.y).toBeGreaterThanOrEqual(500)
  })

  it('una columna sin entrada en el array se siembra a 0, no a NaN/undefined', () => {
    // Solo se siembra la columna 0; la 1 y la 2 no tienen entrada.
    const { positions } = computeMasonryLayout(ITEMS, 900, 3, [500])

    expect(positions.every((p) => Number.isFinite(p.y))).toBe(true)
    const firstTwo = positions.slice(0, 2)
    expect(firstTwo.every((p) => p.column !== 0)).toBe(true)
  })

  it('totalHeight refleja la altura sembrada cuando no hay items que la superen', () => {
    const { totalHeight } = computeMasonryLayout([], 900, 3, [660, 0, 0])
    expect(totalHeight).toBe(660)
  })

  it('GAP es el margen que hay que sumar a mano al sembrar, la función no lo añade por su cuenta', () => {
    const contentBlockHeight = 500
    const { positions } = computeMasonryLayout(ITEMS, 900, 3, [
      contentBlockHeight,
      0,
      0,
    ])

    const inSeededColumn = positions.find((p) => p.column === 0)!
    // Sin sumar GAP al sembrar, el primer pin de esa columna arranca
    // pegado exactamente a la altura sembrada — el hueco visual es
    // responsabilidad de quien siembra (sembrar contentBlockHeight + GAP
    // si lo quiere), no de computeMasonryLayout.
    expect(inSeededColumn.y).toBe(contentBlockHeight)
    expect(inSeededColumn.y).not.toBe(contentBlockHeight + GAP)
  })

  it('las columnas "liberadas" (sembradas) vuelven a recibir items una vez las demás las alcanzan', () => {
    // Con muchos más items que en los tests anteriores, las columnas de
    // recomendación (1 y 2) acaban superando los 500px sembrados en la 0,
    // y a partir de ahí la 0 vuelve a ser candidata — comprobamos que
    // efectivamente hay más de un item en la columna 0 al final.
    const manyItems: LayoutInputItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: `pin-${i}`,
      ratio: '1:1',
    }))

    const { positions } = computeMasonryLayout(manyItems, 900, 3, [500, 0, 0])
    const inColumnZero = positions.filter((p) => p.column === 0)

    expect(inColumnZero.length).toBeGreaterThan(1)
  })
})

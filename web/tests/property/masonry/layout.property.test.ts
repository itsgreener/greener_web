import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  computeMasonryLayout,
  columnsForViewport,
  heightForRatio,
  BREAKPOINTS,
  type LayoutInputItem,
  type PinRatio,
} from '@/modules/masonry/domain/layout'

const RATIOS: PinRatio[] = ['1:1', '4:3', '4:5', '3:4', '2:3', '9:16', '16:9']

const itemArb: fc.Arbitrary<LayoutInputItem> = fc.record({
  id: fc.uuid(),
  ratio: fc.constantFrom(...RATIOS),
})

describe('computeMasonryLayout — determinismo y ausencia de solapes', () => {
  it('misma entrada produce siempre el mismo layout', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 0, maxLength: 60 }),
        fc.integer({ min: 320, max: 2000 }),
        fc.integer({ min: 1, max: 6 }),
        (items, width, columns) => {
          const a = computeMasonryLayout(items, width, columns)
          const b = computeMasonryLayout(items, width, columns)
          expect(a).toEqual(b)
        },
      ),
      { numRuns: 500 },
    )
  })

  it('todos los items reciben posición, ninguno se pierde ni se duplica', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 0, maxLength: 60 }),
        fc.integer({ min: 320, max: 2000 }),
        fc.integer({ min: 1, max: 6 }),
        (items, width, columns) => {
          const { positions } = computeMasonryLayout(items, width, columns)
          expect(positions.length).toBe(items.length)
          expect(new Set(positions.map((p) => p.id)).size).toBe(items.length)
        },
      ),
      { numRuns: 500 },
    )
  })

  it('con todas las columnas sembradas a 0, initialColumnHeights es un no-op', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 0, maxLength: 60 }),
        fc.integer({ min: 320, max: 2000 }),
        fc.integer({ min: 1, max: 6 }),
        (items, width, columns) => {
          const withoutParam = computeMasonryLayout(items, width, columns)
          const withZeros = computeMasonryLayout(
            items,
            width,
            columns,
            new Array(columns).fill(0),
          )
          expect(withoutParam).toEqual(withZeros)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('con initialColumnHeights, ninguna posición cae por debajo de la altura sembrada de su columna', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 0, maxLength: 60 }),
        fc.integer({ min: 320, max: 2000 }),
        fc.integer({ min: 1, max: 6 }),
        fc.array(fc.integer({ min: 0, max: 3000 }), {
          minLength: 1,
          maxLength: 6,
        }),
        (items, width, columns, seeds) => {
          const { positions } = computeMasonryLayout(
            items,
            width,
            columns,
            seeds,
          )
          for (const p of positions) {
            const seeded = seeds[p.column] ?? 0
            expect(p.y).toBeGreaterThanOrEqual(seeded)
          }
        },
      ),
      { numRuns: 500 },
    )
  })

  it('ningún pin se asigna a una columna fuera de rango', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 60 }),
        fc.integer({ min: 320, max: 2000 }),
        fc.integer({ min: 1, max: 6 }),
        (items, width, columns) => {
          const { positions } = computeMasonryLayout(items, width, columns)
          for (const p of positions) {
            expect(p.column).toBeGreaterThanOrEqual(0)
            expect(p.column).toBeLessThan(columns)
          }
        },
      ),
      { numRuns: 500 },
    )
  })

  it('dos pines en la misma columna nunca se solapan verticalmente', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 2, maxLength: 60 }),
        fc.integer({ min: 320, max: 2000 }),
        fc.integer({ min: 1, max: 6 }),
        (items, width, columns) => {
          const { positions } = computeMasonryLayout(items, width, columns)
          const byColumn = new Map<number, typeof positions>()
          for (const p of positions) {
            const list = byColumn.get(p.column) ?? []
            list.push(p)
            byColumn.set(p.column, list)
          }
          for (const list of byColumn.values()) {
            const sorted = [...list].sort((a, b) => a.y - b.y)
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].y + sorted[i].height).toBeLessThanOrEqual(
                sorted[i + 1].y,
              )
            }
          }
        },
      ),
      { numRuns: 500 },
    )
  })

  it('todas las columnas tienen el mismo ancho y encajan en el contenedor', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 320, max: 2000 }),
        fc.integer({ min: 1, max: 6 }),
        (items, width, columns) => {
          const { positions } = computeMasonryLayout(items, width, columns)
          const widths = new Set(positions.map((p) => p.width))
          expect(widths.size).toBeLessThanOrEqual(1)
          for (const p of positions) {
            expect(p.x + p.width).toBeLessThanOrEqual(width + 1) // tolerancia de redondeo
          }
        },
      ),
      { numRuns: 500 },
    )
  })

  it('la altura calculada a partir del ratio es siempre positiva', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RATIOS),
        fc.integer({ min: 50, max: 800 }),
        (ratio, width) => {
          expect(heightForRatio(ratio, width)).toBeGreaterThan(0)
        },
      ),
      { numRuns: 200 },
    )
  })
})

describe('columnsForViewport — coincide con la tabla de breakpoints de §10.1', () => {
  it('cada breakpoint documentado devuelve el número de columnas fijado', () => {
    expect(columnsForViewport(320)).toBe(2) // < 640
    expect(columnsForViewport(700)).toBe(3) // 640-899
    expect(columnsForViewport(1000)).toBe(4) // 900-1199
    expect(columnsForViewport(1400)).toBe(5) // 1200-1599
    expect(columnsForViewport(1920)).toBe(6) // >= 1600
  })

  it('es monótono no decreciente al crecer el viewport', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 3000 }),
        fc.integer({ min: 0, max: 500 }),
        (width, delta) => {
          expect(columnsForViewport(width + delta)).toBeGreaterThanOrEqual(
            columnsForViewport(width),
          )
        },
      ),
      { numRuns: 300 },
    )
  })

  it('cubre todo el rango sin huecos (BREAKPOINTS es exhaustivo)', () => {
    expect(BREAKPOINTS[BREAKPOINTS.length - 1].maxWidth).toBe(Infinity)
  })
})

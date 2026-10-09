import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  columnReservationForRatio,
  computeContentBlockGeometry,
  contentBlockImageDimensions,
  CONTENT_BLOCK_TEXT_GAP_PX,
  mobileContentImageDimensions,
} from '@/modules/masonry/domain/detailLayout'
import { columnsForViewport } from '@/modules/masonry/domain/layout'

describe('columnReservationForRatio — tabla base de 6 columnas (especificacion-final-formato-detalle.md §2)', () => {
  it('16:9 → 5 columnas de contenido, 1 de recomendación', () => {
    expect(columnReservationForRatio('16:9', 6)).toEqual({
      contentColumns: 5,
      recommendationColumns: 1,
    })
  })

  it('1:1 y 4:3 → 4 columnas de contenido, 2 de recomendación', () => {
    expect(columnReservationForRatio('1:1', 6)).toEqual({
      contentColumns: 4,
      recommendationColumns: 2,
    })
    expect(columnReservationForRatio('4:3', 6)).toEqual({
      contentColumns: 4,
      recommendationColumns: 2,
    })
  })

  it.each(['9:16', '3:4', '4:5', '2:3'] as const)(
    '%s (vertical) → 3 columnas de contenido, 3 de recomendación',
    (ratio) => {
      expect(columnReservationForRatio(ratio, 6)).toEqual({
        contentColumns: 3,
        recommendationColumns: 3,
      })
    },
  )
})

describe('columnReservationForRatio — aproximación para 5/4/3 columnas totales', () => {
  it('16:9: 1 rec a 5 columnas, 0 a partir de 4', () => {
    expect(columnReservationForRatio('16:9', 5).recommendationColumns).toBe(1)
    expect(columnReservationForRatio('16:9', 4).recommendationColumns).toBe(0)
    expect(columnReservationForRatio('16:9', 3).recommendationColumns).toBe(0)
  })

  it('1:1/4:3: 2 rec a 5 columnas, 1 a 4, 0 a 3', () => {
    expect(columnReservationForRatio('4:3', 5).recommendationColumns).toBe(2)
    expect(columnReservationForRatio('4:3', 4).recommendationColumns).toBe(1)
    expect(columnReservationForRatio('4:3', 3).recommendationColumns).toBe(0)
  })

  it('verticales: 2 rec a 5 columnas, 1 a 4, 1 a 3 (fila ajustada del documento)', () => {
    expect(columnReservationForRatio('4:5', 5).recommendationColumns).toBe(2)
    expect(columnReservationForRatio('4:5', 4).recommendationColumns).toBe(1)
    expect(columnReservationForRatio('4:5', 3).recommendationColumns).toBe(1)
  })

  it('el contenido siempre es "lo que sobra": contentColumns + recommendationColumns === totalColumns', () => {
    const ratios = ['16:9', '1:1', '4:3', '4:5', '3:4', '2:3', '9:16'] as const
    for (const ratio of ratios) {
      for (const total of [3, 4, 5, 6]) {
        const { contentColumns, recommendationColumns } =
          columnReservationForRatio(ratio, total)
        expect(contentColumns + recommendationColumns).toBe(total)
      }
    }
  })
})

describe('columnReservationForRatio — móvil (<3 columnas totales), fuera de la tabla del documento a propósito', () => {
  it('sin panel lateral nunca, todo el ancho para el contenido, sea cual sea el ratio', () => {
    expect(columnReservationForRatio('16:9', 2)).toEqual({
      contentColumns: 2,
      recommendationColumns: 0,
    })
    expect(columnReservationForRatio('9:16', 2)).toEqual({
      contentColumns: 2,
      recommendationColumns: 0,
    })
  })
})

describe('contentBlockImageDimensions — altura 66,7vh × ratio, tope 83% del ancho (especificacion-final-formato-detalle.md §2)', () => {
  it('sin tocar el tope, el ancho es exactamente altura × ratio', () => {
    // 66,7% de 1000px de viewport = 667px de alto. 16:9 = 1.778.
    const { width, height } = contentBlockImageDimensions('16:9', 2000, 1000)
    expect(height).toBeCloseTo(667, 0)
    expect(width).toBeCloseTo(667 * (16 / 9), 0)
  })

  it('el ratio nunca cambia: width / height es siempre el ratio pedido, se recorte o no la altura', () => {
    const ratios = ['16:9', '1:1', '4:3', '4:5', '3:4', '2:3', '9:16'] as const
    for (const ratio of ratios) {
      const decimal = {
        '16:9': 16 / 9,
        '1:1': 1,
        '4:3': 4 / 3,
        '4:5': 4 / 5,
        '3:4': 3 / 4,
        '2:3': 2 / 3,
        '9:16': 9 / 16,
      }[ratio]
      const { width, height } = contentBlockImageDimensions(ratio, 300, 1200)
      expect(width / height).toBeCloseTo(decimal, 5)
    }
  })

  it('si el ancho natural supera el 83% del ancho útil, se recorta la ALTURA, no el ratio', () => {
    // Viewport muy alto + ratio panorámico + poco ancho útil de contenido:
    // altura natural 66,7vh grande, ancho natural (altura × 16/9) mayor
    // que el 83% de un ancho útil pequeño.
    const availableContentWidthPx = 400
    const { width, height } = contentBlockImageDimensions(
      '16:9',
      availableContentWidthPx,
      2000, // viewport muy alto
    )
    const cap = availableContentWidthPx * 0.83
    expect(width).toBeCloseTo(cap, 5)
    expect(width / height).toBeCloseTo(16 / 9, 5)
  })

  it('con el ancho recortado, el resultado nunca supera el 83% del ancho útil', () => {
    const { width } = contentBlockImageDimensions('16:9', 250, 3000)
    expect(width).toBeLessThanOrEqual(250 * 0.83 + 0.001)
  })
})

describe('mobileContentImageDimensions — placeholder de móvil (decisión del 21 sep)', () => {
  it('ocupa siempre todo el ancho disponible, sin tope del 83% ni regla de 66,7vh', () => {
    const { width } = mobileContentImageDimensions('16:9', 360)
    expect(width).toBe(360)
  })

  it('la altura sale del ratio natural, no de la altura del viewport', () => {
    const { width, height } = mobileContentImageDimensions('4:5', 360)
    expect(width / height).toBeCloseTo(4 / 5, 5)
    expect(height).toBeCloseTo(360 / (4 / 5), 5)
  })

  it('a igualdad de ancho, un viewport muy alto no cambia el resultado (a diferencia de contentBlockImageDimensions)', () => {
    // No recibe viewportHeightPx en absoluto — la firma de la función ya
    // lo deja claro, esto es solo la comprobación de que dos llamadas
    // con el mismo ancho dan el mismo resultado.
    const a = mobileContentImageDimensions('16:9', 400)
    const b = mobileContentImageDimensions('16:9', 400)
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------
// Texto de tipo A limitado a una columna (2 oct 2026)
// ---------------------------------------------------------------------

const ALL_RATIOS = ['16:9', '1:1', '4:3', '4:5', '3:4', '2:3', '9:16'] as const
const RATIO_DECIMAL: Record<(typeof ALL_RATIOS)[number], number> = {
  '16:9': 16 / 9,
  '1:1': 1,
  '4:3': 4 / 3,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '2:3': 2 / 3,
  '9:16': 9 / 16,
}
const ratioArb = fc.constantFrom(...ALL_RATIOS)

describe('contentBlockImageDimensions con textReserve — el texto nunca queda por debajo de su ancho', () => {
  it('sin textReserve el resultado es exactamente el de siempre', () => {
    fc.assert(
      fc.property(
        ratioArb,
        fc.integer({ min: 200, max: 3000 }),
        fc.integer({ min: 400, max: 2000 }),
        (ratio, available, viewport) => {
          expect(
            contentBlockImageDimensions(ratio, available, viewport),
          ).toEqual(
            contentBlockImageDimensions(ratio, available, viewport, undefined),
          )
        },
      ),
    )
  })

  it('imagen + hueco + texto nunca superan el ancho útil, para cualquier ratio y viewport', () => {
    fc.assert(
      fc.property(
        ratioArb,
        fc.integer({ min: 300, max: 3000 }), // ancho útil reservado
        fc.integer({ min: 400, max: 2000 }), // alto del viewport
        fc.integer({ min: 120, max: 280 }), // una columna
        (ratio, available, viewport, column) => {
          fc.pre(available > column + 16)
          const { width } = contentBlockImageDimensions(
            ratio,
            available,
            viewport,
            { widthPx: column, gapPx: 16 },
          )
          expect(width + 16 + column).toBeLessThanOrEqual(available + 0.001)
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('el ratio se respeta siempre y la imagen nunca crece respecto a la regla antigua', () => {
    fc.assert(
      fc.property(
        ratioArb,
        fc.integer({ min: 300, max: 3000 }),
        fc.integer({ min: 400, max: 2000 }),
        fc.integer({ min: 120, max: 280 }),
        (ratio, available, viewport, column) => {
          fc.pre(available > column + 16)
          const old = contentBlockImageDimensions(ratio, available, viewport)
          const next = contentBlockImageDimensions(ratio, available, viewport, {
            widthPx: column,
            gapPx: 16,
          })
          expect(next.width / next.height).toBeCloseTo(RATIO_DECIMAL[ratio], 5)
          expect(next.width).toBeLessThanOrEqual(old.width + 0.001)
          expect(next.height).toBeLessThanOrEqual(old.height + 0.001)
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('si la regla antigua ya deja sitio de sobra, la imagen no se toca', () => {
    // Vertical 9:16 en un bloque ancho: la imagen es estrecha y el texto cabe.
    const old = contentBlockImageDimensions('9:16', 1200, 800)
    const next = contentBlockImageDimensions('9:16', 1200, 800, {
      widthPx: 200,
      gapPx: 16,
    })
    expect(next).toEqual(old)
  })
})

describe('computeContentBlockGeometry', () => {
  const COLUMNS_BY_WIDTH = columnsForViewport

  function base(
    containerWidth: number,
    ratio = '4:3' as (typeof ALL_RATIOS)[number],
  ) {
    const totalColumns = COLUMNS_BY_WIDTH(containerWidth)
    return {
      containerWidth,
      viewportHeight: 800,
      ratio,
      totalColumns,
      contentColumns: columnReservationForRatio(ratio, totalColumns)
        .contentColumns,
    }
  }

  it('sin medir (ancho o alto 0) devuelve todo a 0', () => {
    expect(
      computeContentBlockGeometry({ ...base(1300), containerWidth: 0 }),
    ).toEqual({
      imageWidth: 0,
      imageHeight: 0,
      reservedWidth: 0,
      textColumnWidth: 0,
    })
    expect(
      computeContentBlockGeometry({ ...base(1300), viewportHeight: 0 })
        .textColumnWidth,
    ).toBe(0)
  })

  it('SIN textColumn (casos y episodios) coincide con la fórmula original de siempre', () => {
    fc.assert(
      fc.property(
        ratioArb,
        fc.integer({ min: 300, max: 2800 }),
        fc.integer({ min: 400, max: 1600 }),
        fc.boolean(), // fullWidthContent
        (ratio, containerWidth, viewportHeight, fullWidth) => {
          const totalColumns = COLUMNS_BY_WIDTH(containerWidth)
          const contentColumns = fullWidth
            ? totalColumns
            : columnReservationForRatio(ratio, totalColumns).contentColumns

          // Oráculo: la fórmula tal y como estaba inline en el hook.
          const GAP = 12
          const columnWidth =
            (containerWidth - GAP * (totalColumns - 1)) / totalColumns
          const reservedWidth =
            contentColumns * columnWidth + GAP * (contentColumns - 1)
          const image =
            totalColumns <= 2
              ? mobileContentImageDimensions(ratio, reservedWidth)
              : contentBlockImageDimensions(
                  ratio,
                  reservedWidth,
                  viewportHeight,
                )

          const got = computeContentBlockGeometry({
            containerWidth,
            viewportHeight,
            ratio,
            totalColumns,
            contentColumns,
          })

          expect(got).toEqual({
            imageWidth: image.width,
            imageHeight: image.height,
            reservedWidth,
            textColumnWidth: 0,
          })
        },
      ),
      { numRuns: 500 },
    )
  })

  it('CON textColumn en escritorio: el texto mide como MÍNIMO una columna, se queda con todo el resto del bloque y siempre cabe a su lado', () => {
    fc.assert(
      fc.property(
        ratioArb,
        fc.integer({ min: 900, max: 2800 }), // ≥ 3 columnas (no móvil)
        fc.integer({ min: 400, max: 1600 }),
        (ratio, containerWidth, viewportHeight) => {
          const totalColumns = COLUMNS_BY_WIDTH(containerWidth)
          const { contentColumns } = columnReservationForRatio(
            ratio,
            totalColumns,
          )
          const geo = computeContentBlockGeometry({
            containerWidth,
            viewportHeight,
            ratio,
            totalColumns,
            contentColumns,
            textColumn: true,
          })

          const columnWidth =
            (containerWidth - 12 * (totalColumns - 1)) / totalColumns
          // Nunca menos de una columna…
          expect(geo.textColumnWidth).toBeGreaterThanOrEqual(columnWidth - 1e-6)
          // …y, si la imagen deja más hueco dentro del bloque reservado,
          // el texto ocupa todo ese resto (el CTA queda en la esquina
          // inferior derecha REAL de la caja de texto).
          expect(geo.textColumnWidth).toBeCloseTo(
            Math.max(
              columnWidth,
              geo.reservedWidth - geo.imageWidth - CONTENT_BLOCK_TEXT_GAP_PX,
            ),
            6,
          )
          // El texto, a ancho completo, cabe junto a la imagen dentro del bloque.
          expect(
            geo.imageWidth + CONTENT_BLOCK_TEXT_GAP_PX + geo.textColumnWidth,
          ).toBeLessThanOrEqual(geo.reservedWidth + 0.001)
          // y la imagen sigue teniendo un tamaño real.
          expect(geo.imageWidth).toBeGreaterThan(0)
          expect(geo.imageHeight).toBeGreaterThan(0)
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('un 1:1 que deja casi dos columnas libres: el texto las usa (más de una columna), no se queda en una', () => {
    // 1200 px → 6 columnas de 190 px; un 1:1 reserva 4 columnas
    // (796 px). A 800 px de alto la imagen mide 533,6 px: quedan
    // 796 − 533,6 − 16 = 246,4 px para el texto, más de una columna.
    const geo = computeContentBlockGeometry({
      containerWidth: 1200,
      viewportHeight: 800,
      ratio: '1:1',
      totalColumns: 6,
      contentColumns: 4,
      textColumn: true,
    })

    const columnWidth = (1200 - 12 * 5) / 6

    expect(geo.reservedWidth).toBeCloseTo(796, 6)
    expect(geo.imageWidth).toBeCloseTo(533.6, 6)
    expect(geo.textColumnWidth).toBeCloseTo(246.4, 6)
    expect(geo.textColumnWidth).toBeGreaterThan(columnWidth)
  })

  it('cuando la imagen ocupa casi todo el bloque, el texto conserva su columna mínima', () => {
    // 16:9 en un contenedor estrecho: la imagen cede espacio y el texto
    // queda exactamente en una columna, nunca por debajo.
    const geo = computeContentBlockGeometry({
      containerWidth: 1200,
      viewportHeight: 1400,
      ratio: '16:9',
      totalColumns: 6,
      contentColumns: 5,
      textColumn: true,
    })

    const columnWidth = (1200 - 12 * 5) / 6

    expect(geo.textColumnWidth).toBeGreaterThanOrEqual(columnWidth - 1e-6)
  })

  it('móvil (<3 columnas): placeholder intacto, sin regla de una columna', () => {
    const geo = computeContentBlockGeometry({
      containerWidth: 360,
      viewportHeight: 800,
      ratio: '4:5',
      totalColumns: 2,
      contentColumns: 2,
      textColumn: true,
    })
    expect(geo.textColumnWidth).toBe(0)
    expect(geo.imageWidth).toBe(geo.reservedWidth)
  })

  it('CONTENT_BLOCK_TEXT_GAP_PX coincide con el gap real de .contentBlock en el CSS', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/detail/ToolInsightDetail.module.css'),
      'utf8',
    )
    const globals = readFileSync(
      join(process.cwd(), 'src/app/globals.css'),
      'utf8',
    )
    const gapVar = css.match(/\.contentBlock\s*\{[^}]*gap:\s*var\((--[\w-]+)\)/)
    expect(gapVar, '.contentBlock debe usar gap: var(--space-*)').not.toBeNull()
    const value = globals.match(new RegExp(`${gapVar![1]}:\\s*(\\d+)px`))
    expect(Number(value![1])).toBe(CONTENT_BLOCK_TEXT_GAP_PX)
  })

  it('el CSS de .text usa --text-column-width como ancho (width y flex-basis), no como tope', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/detail/ToolInsightDetail.module.css'),
      'utf8',
    )
    // `width` y `flex` toman el ancho real que calcula el JS…
    expect(css).toMatch(
      /\.text\s*\{[^}]*[\s;{]width:\s*var\(--text-column-width/,
    )
    expect(css).toMatch(
      /\.text\s*\{[^}]*[\s;{]flex:\s*0 0 var\(--text-column-width/,
    )
    // …y ya no es un max-width de una columna (dejaba una franja vacía y
    // adelantaba el CTA).
    expect(css).not.toMatch(
      /\.text\s*\{[^}]*max-width:\s*var\(--text-column-width/,
    )
  })
})

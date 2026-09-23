import { describe, it, expect } from 'vitest'

import {
  columnReservationForRatio,
  contentBlockImageDimensions,
  mobileContentImageDimensions,
} from '@/modules/masonry/domain/detailLayout'

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

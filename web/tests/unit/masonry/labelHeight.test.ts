import { describe, expect, it } from 'vitest'
import {
  estimateLabelHeight,
  estimateWrappedLines,
  LABEL_LINE_HEIGHT,
  LABEL_SAFETY,
  LABEL_SECONDARY_GAP,
  LABEL_TOP_GAP,
} from '@/modules/masonry/domain/labelHeight'

describe('estimateWrappedLines', () => {
  it('un texto vacío o en blanco no ocupa líneas', () => {
    expect(estimateWrappedLines('', 200, 2)).toBe(0)
    expect(estimateWrappedLines('   ', 200, 2)).toBe(0)
  })

  it('un texto corto cabe en una línea', () => {
    expect(estimateWrappedLines('Hola mundo', 300, 2)).toBe(1)
  })

  it('un texto largo se corta en maxLines', () => {
    const long = 'palabra '.repeat(60)
    expect(estimateWrappedLines(long, 120, 2)).toBe(2)
    expect(estimateWrappedLines(long, 120, 3)).toBe(3)
  })
})

describe('estimateLabelHeight', () => {
  it('sin texto no reserva nada', () => {
    expect(estimateLabelHeight({}, 300)).toBe(0)
    expect(estimateLabelHeight({ label: null }, 300)).toBe(0)
  })

  it('un gancho de tool/insight de una línea reserva hueco + línea + margen', () => {
    expect(estimateLabelHeight({ label: 'Corto' }, 300)).toBe(
      LABEL_TOP_GAP + LABEL_LINE_HEIGHT + LABEL_SAFETY,
    )
  })

  it('un caso con título y secundario suma la línea secundaria y su separación', () => {
    expect(
      estimateLabelHeight(
        { displayTitle: 'Título', displaySecondary: 'Cliente' },
        300,
      ),
    ).toBe(
      LABEL_TOP_GAP +
        LABEL_LINE_HEIGHT +
        LABEL_SECONDARY_GAP +
        LABEL_LINE_HEIGHT +
        LABEL_SAFETY,
    )
  })

  it('displayTitle manda sobre label', () => {
    expect(
      estimateLabelHeight({ displayTitle: 'Título', label: 'Gancho' }, 300),
    ).toBe(LABEL_TOP_GAP + LABEL_LINE_HEIGHT + LABEL_SAFETY)
  })
})

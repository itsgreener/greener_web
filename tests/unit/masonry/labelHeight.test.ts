import { describe, expect, it } from 'vitest'
import {
  estimateLabelHeight,
  estimateWrappedLines,
  LABEL_LINE_HEIGHT,
  LABEL_LINE_HEIGHT_FULL_HD,
  labelMetrics,
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

describe('estimateLabelHeight a partir de 1080p (1920 px de viewport)', () => {
  it('por debajo de 1920 px no cambia nada', () => {
    expect(labelMetrics(1919).lineHeight).toBe(LABEL_LINE_HEIGHT)
    expect(estimateLabelHeight({ label: 'Corto' }, 300, 1919)).toBe(
      estimateLabelHeight({ label: 'Corto' }, 300),
    )
  })

  it('desde 1920 px (incluido) la línea mide 19 px', () => {
    expect(labelMetrics(1920).lineHeight).toBe(LABEL_LINE_HEIGHT_FULL_HD)
    expect(estimateLabelHeight({ label: 'Corto' }, 300, 1920)).toBe(
      LABEL_TOP_GAP + LABEL_LINE_HEIGHT_FULL_HD + LABEL_SAFETY,
    )
  })

  it('la letra más grande cabe menos por línea: un título que ocupa una línea a 1919 pasa a dos a 1920', () => {
    const title = 'Una campaña de movilidad en el barrio'
    const small = estimateLabelHeight({ displayTitle: title }, 270, 1919)
    const large = estimateLabelHeight({ displayTitle: title }, 270, 1920)

    expect(large).toBeGreaterThan(small)
  })
})

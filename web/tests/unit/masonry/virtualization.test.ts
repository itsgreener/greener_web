import { describe, it, expect } from 'vitest'
import {
  computeVirtualization,
  type BatchHeight,
} from '@/modules/masonry/domain/virtualization'

function heights(count: number, h = 1000): BatchHeight[] {
  return Array.from({ length: count }, (_, i) => ({ batchIndex: i, height: h }))
}

describe('computeVirtualization', () => {
  it('monta el batch visible y hasta 2 antes/después', () => {
    const { mountedBatchIndexes } = computeVirtualization(heights(10), 5)
    expect([...mountedBatchIndexes].sort((a, b) => a - b)).toEqual([
      3, 4, 5, 6, 7,
    ])
  })

  it('cerca del principio no monta índices negativos', () => {
    const { mountedBatchIndexes } = computeVirtualization(heights(10), 0)
    expect([...mountedBatchIndexes].sort((a, b) => a - b)).toEqual([0, 1, 2])
  })

  it('cerca del final no monta índices fuera de rango', () => {
    const { mountedBatchIndexes } = computeVirtualization(heights(10), 9)
    expect([...mountedBatchIndexes].sort((a, b) => a - b)).toEqual([7, 8, 9])
  })

  it('el espaciador superior suma exactamente la altura de los batches no montados antes del visible', () => {
    const { topSpacerHeight } = computeVirtualization(heights(10, 500), 5)
    // No montados antes de 5: batches 0,1,2 -> 3 * 500
    expect(topSpacerHeight).toBe(1500)
  })

  it('el espaciador inferior suma exactamente la altura de los batches no montados después del visible', () => {
    const { bottomSpacerHeight } = computeVirtualization(heights(10, 500), 5)
    // No montados después de 5: batches 8,9 -> 2 * 500
    expect(bottomSpacerHeight).toBe(1000)
  })

  it('con menos batches que el radio de montaje, se montan todos', () => {
    const { mountedBatchIndexes, topSpacerHeight, bottomSpacerHeight } =
      computeVirtualization(heights(3), 1)
    expect(mountedBatchIndexes.size).toBe(3)
    expect(topSpacerHeight).toBe(0)
    expect(bottomSpacerHeight).toBe(0)
  })

  it('espaciadores + montados conservan la altura total (no se pierde scroll)', () => {
    const batches = heights(20, 800)
    const { mountedBatchIndexes, topSpacerHeight, bottomSpacerHeight } =
      computeVirtualization(batches, 12)
    const mountedHeight = [...mountedBatchIndexes].reduce(
      (sum, i) => sum + batches[i].height,
      0,
    )
    const totalHeight = batches.reduce((sum, b) => sum + b.height, 0)
    expect(topSpacerHeight + mountedHeight + bottomSpacerHeight).toBe(
      totalHeight,
    )
  })
})

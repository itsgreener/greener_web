import { describe, expect, it } from 'vitest'

import { estimateLabelHeight } from '@/modules/masonry/domain/labelHeight'
import { masonryKey, toLayoutItem } from '@/modules/masonry/domain/layoutItem'

describe('masonryKey', () => {
  it('une el índice global y el pinId', () => {
    expect(masonryKey(3, 'pin-a')).toBe('3:pin-a')
  })

  it('el mismo pin en dos posiciones da dos claves distintas', () => {
    expect(masonryKey(0, 'pin-a')).not.toBe(masonryKey(7, 'pin-a'))
  })
})

describe('toLayoutItem', () => {
  const pin = {
    pinId: 'p1',
    ratio: '4:5',
    displayTitle: 'Un título de caso',
    displaySecondary: 'Cliente',
    label: null,
  }

  it('usa el pinId como id y conserva el ratio', () => {
    const item = toLayoutItem(pin, 240)

    expect(item.id).toBe('p1')
    expect(item.ratio).toBe('4:5')
  })

  it('el alto del rótulo es el estimado para ese ancho de columna', () => {
    expect(toLayoutItem(pin, 240).labelHeight).toBe(
      estimateLabelHeight(pin, 240),
    )
    expect(toLayoutItem(pin, 240).labelHeight).toBeGreaterThan(0)
  })

  it('un pin sin texto no reserva rótulo', () => {
    const bare = { pinId: 'p2', ratio: '1:1', label: null }

    expect(toLayoutItem(bare, 240).labelHeight).toBe(0)
  })
})

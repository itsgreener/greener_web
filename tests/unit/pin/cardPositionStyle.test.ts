import { describe, expect, it } from 'vitest'

import { cardPositionStyle, type PinCardStyle } from '@/components/pin/PinCard'

describe('cardPositionStyle', () => {
  it('coloca por transform y fija el ancho', () => {
    expect(cardPositionStyle({ x: 12, y: 340.5, width: 200 })).toEqual({
      transform: 'translate(12px, 340.5px)',
      width: 200,
    })
  })

  it('acepta un PinCardStyle completo sin copiar la altura', () => {
    const full: PinCardStyle = { x: 0, y: 0, width: 100, height: 150 }
    const style = cardPositionStyle(full)

    expect(style).toEqual({ transform: 'translate(0px, 0px)', width: 100 })
    expect(style).not.toHaveProperty('height')
  })
})

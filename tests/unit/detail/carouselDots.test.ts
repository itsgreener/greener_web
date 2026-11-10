import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import {
  MAX_VISIBLE_DOTS,
  visibleDots,
} from '@/components/detail/CaseDetail/carouselDots'

const indices = (count: number, active: number) =>
  visibleDots(count, active).map((dot) => dot.index)
const sizes = (count: number, active: number) =>
  visibleDots(count, active).map((dot) => dot.size)

describe('visibleDots: ventana deslizante de 7', () => {
  it('sin diapositivas no hay puntos', () => {
    expect(visibleDots(0, 0)).toEqual([])
  })

  it('hasta 7 diapositivas se pintan todas, a tamaño normal', () => {
    expect(indices(5, 2)).toEqual([0, 1, 2, 3, 4])
    expect(sizes(7, 6)).toEqual(Array(7).fill('full'))
  })

  it('con más, el activo queda al centro', () => {
    expect(indices(20, 10)).toEqual([7, 8, 9, 10, 11, 12, 13])
  })

  it('la ventana se pega al principio y al final de la serie', () => {
    expect(indices(20, 0)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(indices(20, 2)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(indices(20, 19)).toEqual([13, 14, 15, 16, 17, 18, 19])
    expect(indices(20, 17)).toEqual([13, 14, 15, 16, 17, 18, 19])
  })

  it('encoge solo el borde por el que quedan diapositivas', () => {
    expect(sizes(20, 0)).toEqual([
      'full',
      'full',
      'full',
      'full',
      'full',
      'medium',
      'small',
    ])
    expect(sizes(20, 10)).toEqual([
      'small',
      'medium',
      'full',
      'full',
      'full',
      'medium',
      'small',
    ])
    expect(sizes(20, 19)).toEqual([
      'small',
      'medium',
      'full',
      'full',
      'full',
      'full',
      'full',
    ])
  })

  it('un activo fuera de rango se acota', () => {
    expect(indices(20, -5)).toEqual(indices(20, 0))
    expect(indices(20, 99)).toEqual(indices(20, 19))
  })

  it('propiedades: nunca más de 7, contiguos, con el activo y a tamaño normal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.nat(300),
        (count, rawActive) => {
          const active = rawActive % count
          const dots = visibleDots(count, active)

          expect(dots).toHaveLength(Math.min(count, MAX_VISIBLE_DOTS))
          dots.forEach((dot, i) => {
            expect(dot.index).toBeGreaterThanOrEqual(0)
            expect(dot.index).toBeLessThan(count)
            if (i > 0) expect(dot.index).toBe(dots[i - 1].index + 1)
          })
          const current = dots.find((dot) => dot.index === active)
          expect(current?.size).toBe('full')
          // Los extremos de la serie siempre son alcanzables.
          if (active === 0) expect(dots[0].index).toBe(0)
          if (active === count - 1) expect(dots.at(-1)?.index).toBe(count - 1)
        },
      ),
    )
  })
})

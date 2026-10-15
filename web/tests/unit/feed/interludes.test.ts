import { describe, expect, it } from 'vitest'

import { mulberry32 } from '@/modules/feed/domain/prng'
import {
  newsletterItemId,
  planInterludes,
  type InterludeSource,
} from '@/modules/feed/domain/interludes'

/**
 * Casos concretos y el escenario del anexo §13 del plan de `other`
 * (20 contenidos con N entre 75 y 200), que fue el que se simuló con
 * Greener antes de implementar.
 */

function randomCatalog(visit: number, count: number): InterludeSource[] {
  const rng = mulberry32(visit + 1)

  return Array.from({ length: count }, (_, i) => ({
    contentId: `other-${String(i).padStart(2, '0')}`,
    frequency: 75 + Math.floor(rng() * 126),
  }))
}

describe('planInterludes — escenarios', () => {
  it('con un solo contenido de N = 100: primera aparición entre 10 y 30 y luego cada 100', () => {
    const slots = planInterludes(
      'visita',
      [{ contentId: 'a', frequency: 100 }],
      400,
    )

    expect(slots).toHaveLength(4)
    expect(slots[0]!.position).toBeGreaterThanOrEqual(10)
    expect(slots[0]!.position).toBeLessThanOrEqual(30)
    expect(slots.map((s) => s.position - slots[0]!.position)).toEqual([
      0, 100, 200, 300,
    ])
  })

  it('dos contenidos que coincidirían en el mismo pin: el segundo se desplaza a 5 pines del primero', () => {
    // Con N igual y misma semilla de inicio no coinciden por construcción
    // (los inicios se separan 8-15); la coincidencia llega en las
    // repeticiones: N = 25 y N = 40 chocan en el pin 200.
    const slots = planInterludes(
      'choque',
      [
        { contentId: 'a', frequency: 25 },
        { contentId: 'b', frequency: 40 },
      ],
      800,
    )

    for (let i = 1; i < slots.length; i++) {
      expect(
        slots[i]!.position - slots[i - 1]!.position,
      ).toBeGreaterThanOrEqual(5)
    }
  })

  it('20 contenidos con N entre 75 y 200: ≈ 13 % del feed y la última primera aparición hacia el pin 245', () => {
    const visits = 150
    let interludes = 0
    let lastFirst = 0

    for (let visit = 0; visit < visits; visit++) {
      const slots = planInterludes(
        `sim-${visit}`,
        randomCatalog(visit, 20),
        1000,
      )

      interludes += slots.length
      lastFirst += Math.max(
        ...slots.filter((s) => s.occurrence === 0).map((s) => s.position),
      )
    }

    // Cuota sobre el feed servido: interludios / (interludios + pines de ronda).
    const share = interludes / (interludes + 1000 * visits)

    expect(share).toBeGreaterThan(0.11)
    expect(share).toBeLessThan(0.15)
    expect(lastFirst / visits).toBeGreaterThan(220)
    expect(lastFirst / visits).toBeLessThan(270)
  })

  it('con 40 contenidos el techo estructural se mantiene: nunca más de un interludio cada 5 pines', () => {
    const slots = planInterludes('techo', randomCatalog(7, 40), 1000)

    expect(slots.length / 1000).toBeLessThanOrEqual(1 / 5)
  })
})

describe('newsletterItemId', () => {
  it('es único por aparición', () => {
    expect(newsletterItemId('abc', 0)).toBe('newsletter:abc:0')
    expect(newsletterItemId('abc', 3)).not.toBe(newsletterItemId('abc', 4))
  })
})

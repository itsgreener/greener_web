import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import {
  INTERLUDE_RULES,
  interludeStartPositions,
  interludesInRange,
  pagePinIndex,
  planInterludes,
  type InterludeSource,
} from '@/modules/feed/domain/interludes'

/**
 * Propiedades del calendario de interludios (plan de `other` §4 y §10, fase
 * 2). Los contenidos se generan con la frecuencia que permite el ABM
 * (mínimo 25) y hasta 40 `other`, que es más de lo que se prevé.
 */

const RULES = INTERLUDE_RULES

const sourcesArb: fc.Arbitrary<InterludeSource[]> = fc
  .uniqueArray(fc.uuid(), { minLength: 1, maxLength: 40 })
  .chain((ids) =>
    fc.tuple(
      ...ids.map((contentId) =>
        fc
          .integer({ min: RULES.minFrequency, max: 250 })
          .map((frequency): InterludeSource => ({ contentId, frequency })),
      ),
    ),
  )

const seedArb = fc.string({ minLength: 1, maxLength: 24 })

const HORIZON = 1000

describe('planInterludes — propiedades', () => {
  it('es determinista por seed e independiente del orden de entrada', () => {
    fc.assert(
      fc.property(sourcesArb, seedArb, (sources, seed) => {
        const reversed = [...sources].reverse()

        expect(planInterludes(seed, sources, HORIZON)).toEqual(
          planInterludes(seed, reversed, HORIZON),
        )
      }),
      { numRuns: 100 },
    )
  })

  it('cada visita (seed) barraja distinto: con 6 o más contenidos no salen todas igual', () => {
    const sources = Array.from({ length: 8 }, (_, i) => ({
      contentId: `c${i}`,
      frequency: 100,
    }))
    const firstOf = new Set<string>()

    for (let i = 0; i < 40; i++) {
      firstOf.add(planInterludes(`visita-${i}`, sources, 60)[0]!.contentId)
    }

    expect(firstOf.size).toBeGreaterThan(3)
  })

  it('el primer contenido del orden cae entre el pin 10 y el 30; cada inicio posterior, 8 a 15 por encima del anterior', () => {
    fc.assert(
      fc.property(sourcesArb, seedArb, (sources, seed) => {
        const starts = interludeStartPositions(seed, sources).map(
          (entry) => entry.start,
        )

        expect(starts[0]).toBeGreaterThanOrEqual(RULES.firstMin)
        expect(starts[0]).toBeLessThanOrEqual(RULES.firstMax)

        for (let i = 1; i < starts.length; i++) {
          const step = starts[i]! - starts[i - 1]!

          expect(step).toBeGreaterThanOrEqual(RULES.stepMin)
          expect(step).toBeLessThanOrEqual(RULES.stepMax)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('la primera aparición del feed es el inicio del primer contenido (nunca antes del 10 ni después del 30)', () => {
    fc.assert(
      fc.property(sourcesArb, seedArb, (sources, seed) => {
        const first = planInterludes(seed, sources, HORIZON)[0]!

        expect(first.position).toBeGreaterThanOrEqual(RULES.firstMin)
        expect(first.position).toBeLessThanOrEqual(RULES.firstMax)
      }),
      { numRuns: 100 },
    )
  })

  it('entre dos interludios hay siempre al menos 5 pines de ronda', () => {
    fc.assert(
      fc.property(sourcesArb, seedArb, (sources, seed) => {
        const slots = planInterludes(seed, sources, HORIZON)

        for (let i = 1; i < slots.length; i++) {
          expect(
            slots[i]!.position - slots[i - 1]!.position,
          ).toBeGreaterThanOrEqual(RULES.minGap)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('una repetición nunca se retrasa más de 20 pines sobre su posición nominal, y nunca llega antes', () => {
    fc.assert(
      fc.property(sourcesArb, seedArb, (sources, seed) => {
        const starts = new Map(
          interludeStartPositions(seed, sources).map((entry) => [
            entry.source.contentId,
            { start: entry.start, frequency: entry.source.frequency },
          ]),
        )

        for (const slot of planInterludes(seed, sources, HORIZON)) {
          const { start, frequency } = starts.get(slot.contentId)!
          const nominal = start + slot.occurrence * frequency
          const delay = slot.position - nominal

          expect(delay).toBeGreaterThanOrEqual(0)

          if (slot.occurrence > 0) {
            expect(delay).toBeLessThanOrEqual(RULES.maxRepeatDelay)
          }
        }
      }),
      { numRuns: 100 },
    )
  })

  it('la primera aparición de cada contenido nunca se omite, aunque se retrase', () => {
    fc.assert(
      fc.property(sourcesArb, seedArb, (sources, seed) => {
        // Horizonte holgado: con 40 contenidos el último arranca hacia el
        // pin 480 y, con separación 5, su retraso nunca pasa de unos cientos.
        const slots = planInterludes(seed, sources, 3000)
        const firsts = new Set(
          slots.filter((s) => s.occurrence === 0).map((s) => s.contentId),
        )

        expect(firsts.size).toBe(sources.length)
      }),
      { numRuns: 60 },
    )
  })

  it('un contenido solo repite exactamente cada N pines desde su posición inicial', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: RULES.minFrequency, max: 250 }),
        seedArb,
        (frequency, seed) => {
          const slots = planInterludes(
            seed,
            [{ contentId: 'solo', frequency }],
            HORIZON,
          )

          expect(slots.length).toBeGreaterThan(0)

          slots.forEach((slot, index) => {
            expect(slot.occurrence).toBe(index)
            expect(slot.position).toBe(slots[0]!.position + index * frequency)
          })
        },
      ),
      { numRuns: 100 },
    )
  })

  it('el plan hasta el pin X es prefijo exacto del plan hasta cualquier Y > X', () => {
    fc.assert(
      fc.property(
        sourcesArb,
        seedArb,
        fc.integer({ min: 1, max: 600 }),
        (sources, seed, short) => {
          const long = planInterludes(seed, sources, 1200)

          expect(planInterludes(seed, sources, short)).toEqual(
            long.filter((slot) => slot.position <= short),
          )
        },
      ),
      { numRuns: 100 },
    )
  })

  it('servir en lotes de 20, de 40 o de golpe da exactamente los mismos interludios', () => {
    fc.assert(
      fc.property(sourcesArb, seedArb, (sources, seed) => {
        const whole = planInterludes(seed, sources, 600)

        for (const size of [20, 40]) {
          const chunked = []

          for (let from = 0; from < 600; from += size) {
            chunked.push(...interludesInRange(seed, sources, from, from + size))
          }

          expect(chunked).toEqual(whole)
        }
      }),
      { numRuns: 60 },
    )
  })

  it('con cualquier número de contenidos nunca hay más de 6 interludios en 30 pines', () => {
    fc.assert(
      fc.property(sourcesArb, seedArb, (sources, seed) => {
        const slots = planInterludes(seed, sources, HORIZON)

        for (let start = 1; start <= HORIZON - 30; start++) {
          const inWindow = slots.filter(
            (slot) => slot.position >= start && slot.position < start + 30,
          ).length

          expect(inWindow).toBeLessThanOrEqual(6)
        }
      }),
      { numRuns: 30 },
    )
  })

  it('una frecuencia rota (0, negativa, NaN) se trata como el mínimo y no cuelga el cálculo', () => {
    for (const frequency of [0, -5, Number.NaN, 3.9]) {
      const slots = planInterludes('s', [{ contentId: 'x', frequency }], 200)

      expect(slots.length).toBeGreaterThan(1)
      expect(slots[1]!.position - slots[0]!.position).toBe(RULES.minFrequency)
    }
  })

  it('sin contenidos o con horizonte 0 no hay interludios', () => {
    expect(planInterludes('s', [], 500)).toEqual([])
    expect(planInterludes('s', [{ contentId: 'x', frequency: 50 }], 0)).toEqual(
      [],
    )
  })
})

describe('pagePinIndex', () => {
  it('rota por todos los pines de la página, uno por aparición, y es determinista', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 1, max: 8 }), (seed, pinCount) => {
        const seen = new Set<number>()

        for (let occurrence = 0; occurrence < pinCount; occurrence++) {
          const index = pagePinIndex(seed, 'pagina', occurrence, pinCount)

          expect(index).toBeGreaterThanOrEqual(0)
          expect(index).toBeLessThan(pinCount)
          expect(index).toBe(pagePinIndex(seed, 'pagina', occurrence, pinCount))
          seen.add(index)
        }

        expect(seen.size).toBe(pinCount)
      }),
      { numRuns: 100 },
    )
  })

  it('una página sin pines devuelve 0 en vez de NaN', () => {
    expect(pagePinIndex('s', 'p', 3, 0)).toBe(0)
  })
})

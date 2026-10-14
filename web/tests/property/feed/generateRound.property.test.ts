import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { generateRound } from '@/modules/feed/domain/generateRound'
import type {
  CaseInput,
  ContentPinQueue,
  FeedConfig,
  FeedSnapshot,
} from '@/modules/feed/domain/types'

// Ratios confirmados con Greener (ADR-11): 70/15/5/5/5.
const BASE_CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  batchSize: 40,
}

function pinQueueArb(contentPrefix: string, minPins: number, maxPins: number) {
  return fc
    .tuple(
      fc.uuid(),
      fc.array(fc.uuid(), { minLength: minPins, maxLength: maxPins }),
    )
    .map(([contentId, pinIds]): ContentPinQueue => ({
      contentId: `${contentPrefix}-${contentId}`,
      pinIds: pinIds.map(
        (p, i) => `${contentPrefix}-${contentId}-pin-${i}-${p}`,
      ),
    }))
}

function caseArb() {
  return fc
    .tuple(pinQueueArb('case', 1, 8), fc.integer({ min: 1, max: 5 }))
    .map(([queue, force]): CaseInput => ({ ...queue, force }))
}

/**
 * Genera universos deliberadamente pequeños en insights/tools (arquitectura
 * §22: "con 5 insights y 30 tools esto ocurrirá siempre" — repetición
 * necesaria), para forzar los pines repetidos por cuota en los tests.
 */
const snapshotArb: fc.Arbitrary<FeedSnapshot> = fc.record({
  cases: fc.array(caseArb(), { minLength: 1, maxLength: 25 }),
  insights: fc.array(pinQueueArb('insight', 1, 3), {
    minLength: 0,
    maxLength: 5,
  }),
  tools: fc.array(pinQueueArb('tool', 1, 3), { minLength: 0, maxLength: 30 }),
  channel: fc.array(pinQueueArb('channel', 1, 3), {
    minLength: 0,
    maxLength: 8,
  }),
  other: fc.array(pinQueueArb('other', 1, 3), { minLength: 0, maxLength: 5 }),
})

const seedArb = fc.string({ minLength: 1, maxLength: 20 })
const roundIndexArb = fc.integer({ min: 0, max: 6 })

describe('generateRound — determinismo', () => {
  it('misma seed, config, snapshot y ronda producen exactamente la misma secuencia', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        seedArb,
        roundIndexArb,
        (snapshot, seed, roundIndex) => {
          const a = generateRound(snapshot, BASE_CONFIG, seed, roundIndex)
          const b = generateRound(snapshot, BASE_CONFIG, seed, roundIndex)
          expect(a.sequence).toEqual(b.sequence)
          expect(a.report).toEqual(b.report)
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('seeds distintas producen, casi siempre, secuencias distintas', () => {
    fc.assert(
      fc.property(snapshotArb, roundIndexArb, (snapshot, roundIndex) => {
        // Necesita algo de universo real para que el orden pueda variar.
        fc.pre(
          snapshot.cases.some((c) => c.pinIds.length > 1) ||
            snapshot.cases.length > 3,
        )
        const a = generateRound(snapshot, BASE_CONFIG, 'seed-A', roundIndex)
        // Con universos pequeños dos seeds distintas PUEDEN coincidir por
        // casualidad (medido: ~1 de cada 10.000 universos, p. ej. un único
        // caso de 5 pines con fuerza 4 → secuencia de 6). Comparar solo
        // dos seeds hacía fallar este test ~1 de cada 50 ejecuciones. Se
        // comparan cuatro seeds alternativas y basta con que UNA difiera:
        // la probabilidad de que las cuatro coincidan a la vez es
        // despreciable y el test sigue detectando un PRNG que ignorase la
        // seed (en ese caso las cuatro coincidirían siempre).
        const others = ['seed-B', 'seed-C', 'seed-D', 'seed-E'].map((seed) =>
          generateRound(snapshot, BASE_CONFIG, seed, roundIndex),
        )
        if (a.sequence.length > 3) {
          expect(
            others.some(
              (b) => JSON.stringify(b.sequence) !== JSON.stringify(a.sequence),
            ),
          ).toBe(true)
        }
      }),
      { numRuns: 100 },
    )
  })
})

describe('generateRound — terminación y conservación de pines', () => {
  it('siempre termina y no pierde ni añade pines: la secuencia es exactamente el multiset de los pools', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        seedArb,
        roundIndexArb,
        (snapshot, seed, roundIndex) => {
          const { sequence, report } = generateRound(
            snapshot,
            BASE_CONFIG,
            seed,
            roundIndex,
          )

          expect(sequence.length).toBe(report.totalPins)

          // actualCounts por tipo debe coincidir exactamente con lo solicitado:
          // la mezcla reordena, nunca descarta ni inventa pines.
          for (const kind of [
            'case',
            'insight',
            'tool',
            'channel',
            'other',
          ] as const) {
            expect(report.actualCounts[kind]).toBe(report.requestedQuotas[kind])
          }
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('con catálogos mínimos (5 insights, 30 tools) sigue terminando en tiempo razonable', () => {
    const snapshot: FeedSnapshot = {
      cases: Array.from({ length: 15 }, (_, i) => ({
        contentId: `case-${i}`,
        force: 2,
        pinIds: [`case-${i}-p1`, `case-${i}-p2`, `case-${i}-p3`],
      })),
      insights: Array.from({ length: 5 }, (_, i) => ({
        contentId: `insight-${i}`,
        pinIds: [`insight-${i}-p1`],
      })),
      tools: Array.from({ length: 30 }, (_, i) => ({
        contentId: `tool-${i}`,
        pinIds: [`tool-${i}-p1`],
      })),
      channel: [],
      other: [],
    }

    const start = Date.now()
    const { report } = generateRound(
      snapshot,
      BASE_CONFIG,
      'seed-catalogo-minimo',
      0,
    )
    expect(Date.now() - start).toBeLessThan(1000)
    // Con solo 5 insights y una cuota bastante mayor, la repetición es
    // inevitable — el informe debe reflejarla, no fallar silenciosamente.
    expect(report.repeatedPins.quota).toBeGreaterThan(0)
  })
})

const MINORITY = ['insight', 'tool', 'channel', 'other'] as const

/** Universos donde los casos sobran: la versión fuerte de la regla de vecindad. */
const caseHeavy = (counts: Record<string, number>) => {
  const minority = counts.insight + counts.tool + counts.channel + counts.other
  return counts.case >= minority + 1
}

describe('generateRound — vecindad (decisión de Greener, 14 oct 2026)', () => {
  it('nunca hay dos pines seguidos del mismo tipo minoritario (todo salvo casos) cuando los casos son mayoría', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        seedArb,
        roundIndexArb,
        (snapshot, seed, roundIndex) => {
          const { sequence, report } = generateRound(
            snapshot,
            BASE_CONFIG,
            seed,
            roundIndex,
          )
          fc.pre(caseHeavy(report.actualCounts))

          for (let i = 1; i < sequence.length; i++) {
            if (sequence[i].kind !== 'case') {
              expect(sequence[i].kind).not.toBe(sequence[i - 1].kind)
            }
          }
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('con casos de sobra, ningún pin que no es caso va pegado a otro, y la ronda empieza y termina con un caso', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        seedArb,
        roundIndexArb,
        (snapshot, seed, roundIndex) => {
          const { sequence, report } = generateRound(
            snapshot,
            BASE_CONFIG,
            seed,
            roundIndex,
          )
          fc.pre(caseHeavy(report.actualCounts))

          expect(sequence[0].kind).toBe('case')
          expect(sequence[sequence.length - 1].kind).toBe('case')
          for (let i = 1; i < sequence.length; i++) {
            expect(
              sequence[i].kind !== 'case' && sequence[i - 1].kind !== 'case',
            ).toBe(false)
          }
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('ningún tipo se concentra: en cada tercio de la ronda hay al menos uno de cada tipo minoritario con cuota suficiente', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        seedArb,
        roundIndexArb,
        (snapshot, seed, roundIndex) => {
          const { sequence, report } = generateRound(
            snapshot,
            BASE_CONFIG,
            seed,
            roundIndex,
          )
          fc.pre(caseHeavy(report.actualCounts))

          for (const kind of MINORITY) {
            const quota = report.actualCounts[kind]
            if (quota < 6) continue
            for (let third = 0; third < 3; third++) {
              const from = Math.floor((sequence.length * third) / 3)
              const to = Math.floor((sequence.length * (third + 1)) / 3)
              const inThird = sequence
                .slice(from, to)
                .filter((p) => p.kind === kind).length
              expect(inThird).toBeGreaterThanOrEqual(1)
            }
          }
        },
      ),
      { numRuns: 1000 },
    )
  })
})

describe('generateRound — repetición', () => {
  it('cada pin repetido está etiquetado: «force» solo en casos, «quota» solo en tipos minoritarios', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        seedArb,
        roundIndexArb,
        (snapshot, seed, roundIndex) => {
          const { sequence } = generateRound(
            snapshot,
            BASE_CONFIG,
            seed,
            roundIndex,
          )
          for (const pin of sequence) {
            if (pin.repeat === 'force') expect(pin.kind).toBe('case')
            if (pin.repeat === 'quota') expect(pin.kind).not.toBe('case')
          }
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('un caso aporta exactamente `fuerza` pines a la ronda', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        seedArb,
        roundIndexArb,
        (snapshot, seed, roundIndex) => {
          const { sequence } = generateRound(
            snapshot,
            BASE_CONFIG,
            seed,
            roundIndex,
          )
          for (const c of snapshot.cases) {
            expect(
              sequence.filter((p) => p.contentId === c.contentId).length,
            ).toBe(c.force)
          }
        },
      ),
      { numRuns: 1000 },
    )
  })
})

describe('generateRound — casos límite', () => {
  it('sin casos, la tanda queda vacía sin lanzar', () => {
    const snapshot: FeedSnapshot = {
      cases: [],
      insights: [],
      tools: [],
      channel: [],
      other: [],
    }
    const { sequence, report } = generateRound(snapshot, BASE_CONFIG, 'seed', 0)
    expect(sequence).toEqual([])
    expect(report.totalPins).toBe(0)
  })

  it('un único caso con un único pin no lanza y produce una tanda mínima coherente', () => {
    const snapshot: FeedSnapshot = {
      cases: [{ contentId: 'case-1', force: 1, pinIds: ['pin-1'] }],
      insights: [],
      tools: [],
      channel: [],
      other: [],
    }
    const { sequence, report } = generateRound(snapshot, BASE_CONFIG, 'seed', 0)
    expect(sequence.length).toBe(report.totalPins)
    expect(sequence.some((p) => p.contentId === 'case-1')).toBe(true)
  })

  it('force mayor que los pines disponibles del caso se marca como repetición por fuerza', () => {
    const snapshot: FeedSnapshot = {
      cases: [{ contentId: 'case-1', force: 5, pinIds: ['pin-1', 'pin-2'] }],
      insights: [],
      tools: [],
      channel: [],
      other: [],
    }
    const { sequence } = generateRound(snapshot, BASE_CONFIG, 'seed', 0)
    const casePins = sequence.filter((p) => p.contentId === 'case-1')
    expect(casePins.length).toBe(5)
    expect(casePins.filter((p) => p.repeat === 'force')).toHaveLength(3)
  })
})

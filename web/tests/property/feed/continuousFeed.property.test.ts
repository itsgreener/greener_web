import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { getPinsInRange } from '@/modules/feed/domain/continuousFeed'
import type {
  CaseInput,
  ContentPinQueue,
  FeedConfig,
  FeedSnapshot,
} from '@/modules/feed/domain/types'

const CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  mixWindow: 20,
  distanceWindow: 10,
  batchSize: 40,
}

function pinQueueArb(prefix: string) {
  return fc
    .tuple(fc.uuid(), fc.array(fc.uuid(), { minLength: 1, maxLength: 6 }))
    .map(([id, pinIds]): ContentPinQueue => ({
      contentId: `${prefix}-${id}`,
      pinIds: pinIds.map((p, i) => `${prefix}-${id}-pin-${i}-${p}`),
    }))
}
function caseArb() {
  return fc
    .tuple(pinQueueArb('case'), fc.integer({ min: 1, max: 3 }))
    .map(([q, force]): CaseInput => ({ ...q, force }))
}

const snapshotArb: fc.Arbitrary<FeedSnapshot> = fc.record({
  cases: fc.array(caseArb(), { minLength: 3, maxLength: 20 }),
  insights: fc.array(pinQueueArb('insight'), { minLength: 0, maxLength: 5 }),
  tools: fc.array(pinQueueArb('tool'), { minLength: 0, maxLength: 10 }),
  channel: fc.array(pinQueueArb('channel'), { minLength: 0, maxLength: 5 }),
  other: fc.constant([]),
})

describe('getPinsInRange — scroll continuo entre tandas (brief §4.6)', () => {
  it('es determinista: mismo rango, mismo resultado', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        fc.string({ minLength: 1, maxLength: 10 }),
        (snapshot, seed) => {
          const a = getPinsInRange(snapshot, CONFIG, seed, 0, 100)
          const b = getPinsInRange(snapshot, CONFIG, seed, 0, 100)
          expect(a.items).toEqual(b.items)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('pedir [0,100) y luego [100,200) por separado equivale a pedir [0,200) de una vez', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        fc.string({ minLength: 1, maxLength: 10 }),
        (snapshot, seed) => {
          const whole = getPinsInRange(snapshot, CONFIG, seed, 0, 200)
          const firstHalf = getPinsInRange(snapshot, CONFIG, seed, 0, 100)
          const secondHalf = getPinsInRange(snapshot, CONFIG, seed, 100, 100)
          expect([...firstHalf.items, ...secondHalf.items]).toEqual(whole.items)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('atraviesa varias tandas sin duplicar huecos: longitud exacta = count pedido (universo no vacío)', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        fc.string({ minLength: 1, maxLength: 10 }),
        (snapshot, seed) => {
          // 250 pines fuerza a cruzar varias rondas (~126 pines/ronda en el caso base).
          const { items } = getPinsInRange(snapshot, CONFIG, seed, 0, 250)
          expect(items.length).toBe(250)
        },
      ),
      { numRuns: 50 },
    )
  })

  it('universo vacío no lanza y devuelve una lista vacía', () => {
    const empty: FeedSnapshot = {
      cases: [],
      insights: [],
      tools: [],
      channel: [],
      other: [],
    }
    const { items } = getPinsInRange(empty, CONFIG, 'seed', 0, 50)
    expect(items).toEqual([])
  })
})

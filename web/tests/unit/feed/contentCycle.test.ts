import { describe, it, expect } from 'vitest'
import { generateRound } from '@/modules/feed/domain/generateRound'
import { circularFillPool } from '@/modules/feed/domain/rotateQueue'
import type {
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

const EMPTY: FeedSnapshot = {
  cases: [],
  insights: [],
  tools: [],
  channel: [],
  other: [],
}

function queues(prefix: string, count: number, pins = 1): ContentPinQueue[] {
  return Array.from({ length: count }, (_, i) => ({
    contentId: `${prefix}-${String(i + 1).padStart(2, '0')}`,
    pinIds: Array.from(
      { length: pins },
      (_, k) => `${prefix}-${String(i + 1).padStart(2, '0')}-pin-${k + 1}`,
    ),
  }))
}

const contentIds = (sequence: { contentId: string }[]) =>
  sequence.map((p) => p.contentId)

/**
 * Regresión (13 oct 2026): los pines salían siempre en el mismo orden (en
 * /tools, «elonmuskizer» el primero, «glasspane» el segundo…) porque el
 * ciclo de contenidos arrancaba cada ronda por el primer contenido del
 * catálogo; la seed solo movía QUÉ pin de cada contenido tocaba, no EN QUÉ
 * posición salía. En la home, además, los contenidos que quedaban más allá de
 * la cuota (3 de 30 tools por ronda) no salían nunca.
 */
describe('generateRound — orden de los contenidos de una subhome', () => {
  const tools = queues('tool', 12)
  const snapshot: FeedSnapshot = { ...EMPTY, tools }
  const catalogOrder = contentIds(tools)

  it('cada ronda recorre cada contenido exactamente una vez', () => {
    for (let round = 0; round < 6; round++) {
      const { sequence } = generateRound(snapshot, CONFIG, 'seed-A', round)
      expect(contentIds(sequence).sort()).toEqual([...catalogOrder].sort())
    }
  })

  it('el orden no es el del catálogo y cambia de una sesión a otra', () => {
    const orders = ['s1', 's2', 's3', 's4', 's5'].map((seed) =>
      contentIds(generateRound(snapshot, CONFIG, seed, 0).sequence).join(),
    )
    expect(orders.some((o) => o !== catalogOrder.join())).toBe(true)
    expect(new Set(orders).size).toBeGreaterThan(1)
  })

  it('el orden cambia de una ronda a la siguiente dentro de la misma sesión', () => {
    const orders = [0, 1, 2, 3].map((round) =>
      contentIds(
        generateRound(snapshot, CONFIG, 'seed-A', round).sequence,
      ).join(),
    )
    expect(new Set(orders).size).toBeGreaterThan(1)
  })

  it('no depende del orden en que el catálogo entrega los contenidos', () => {
    const reversed: FeedSnapshot = { ...EMPTY, tools: [...tools].reverse() }
    for (let round = 0; round < 3; round++) {
      expect(generateRound(reversed, CONFIG, 'seed-A', round).sequence).toEqual(
        generateRound(snapshot, CONFIG, 'seed-A', round).sequence,
      )
    }
  })

  it('el pin de cada contenido avanza en cada vuelta y no se repite hasta agotarlos', () => {
    const withPins: FeedSnapshot = { ...EMPTY, tools: queues('tool', 6, 3) }
    const seenPins = new Map<string, string[]>()
    for (let round = 0; round < 3; round++) {
      const { sequence } = generateRound(withPins, CONFIG, 'seed-A', round)
      for (const pin of sequence) {
        seenPins.set(pin.contentId, [
          ...(seenPins.get(pin.contentId) ?? []),
          pin.pinId,
        ])
      }
    }
    for (const pins of seenPins.values()) {
      expect(new Set(pins).size).toBe(3)
    }
  })
})

describe('generateRound — contenidos de un tipo con cuota menor que su catálogo (home)', () => {
  const snapshot: FeedSnapshot = {
    ...EMPTY,
    cases: queues('case', 40, 3).map((c) => ({ ...c, force: 1 })),
    insights: queues('insight', 5, 2),
    tools: queues('tool', 30),
    channel: queues('episode', 16),
    other: queues('other', 4),
  }

  function contentsByRound(kind: 'tool' | 'channel' | 'other', rounds: number) {
    return Array.from({ length: rounds }, (_, round) =>
      generateRound(snapshot, CONFIG, 'seed-home', round)
        .sequence.filter((p) => p.kind === kind)
        .map((p) => p.contentId),
    )
  }

  it('las 30 tools salen una vez cada una antes de que se repita ninguna', () => {
    const quota = generateRound(snapshot, CONFIG, 'seed-home', 0).report
      .requestedQuotas.tool
    const rounds = Math.ceil(30 / quota)
    expect(quota * rounds).toBe(30) // la cuota actual (3) reparte 30 en 10 rondas
    const all = contentsByRound('tool', rounds).flat()
    expect(all).toHaveLength(30)
    expect(new Set(all).size).toBe(30)
  })

  it('los episodios no se repiten hasta haber salido los 16', () => {
    const quota = generateRound(snapshot, CONFIG, 'seed-home', 0).report
      .requestedQuotas.channel
    const roundsWithoutRepeat = Math.floor(16 / quota)
    const all = contentsByRound('channel', roundsWithoutRepeat).flat()
    expect(new Set(all).size).toBe(all.length)
    // Y al cabo de unas cuantas rondas han salido todos.
    const many = contentsByRound('channel', 12).flat()
    expect(new Set(many).size).toBe(16)
  })

  it('los casos salen todos en cada ronda, pero ni en el orden del catálogo ni en el mismo orden cada ronda', () => {
    const catalog = snapshot.cases.map((c) => c.contentId)
    const orders = [0, 1, 2].map((round) => {
      const { sequence } = generateRound(snapshot, CONFIG, 'seed-home', round)
      const cases = contentIds(sequence.filter((p) => p.kind === 'case'))
      expect([...cases].sort()).toEqual([...catalog].sort())
      return cases.join()
    })
    expect(orders.every((o) => o === catalog.join())).toBe(false)
    expect(new Set(orders).size).toBeGreaterThan(1)
  })
})

describe('circularFillPool — ciclo continuo', () => {
  it('con más cuota que contenidos, cruza vueltas sin repetir el mismo contenido seguido', () => {
    const pool = queues('insight', 5, 2)
    const quota = 12
    const ids: string[] = []
    for (let round = 0; round < 20; round++) {
      ids.push(
        ...contentIds(circularFillPool('seed', round, 'insight', pool, quota)),
      )
    }
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).not.toBe(ids[i - 1])
    }
  })

  it('marca como repetición (nivel 4) solo los pines cuyo contenido ya salió en la ronda', () => {
    const pool = queues('insight', 3)
    const result = circularFillPool('seed', 0, 'insight', pool, 7)
    const seen = new Set<string>()
    for (const pin of result) {
      expect(pin.relaxationLevel).toBe(seen.has(pin.contentId) ? 4 : 0)
      seen.add(pin.contentId)
    }
    expect(result.filter((p) => p.relaxationLevel === 0)).toHaveLength(3)
  })

  it('ignora los contenidos sin pines y devuelve la cuota pedida', () => {
    const pool: ContentPinQueue[] = [
      { contentId: 'vacio', pinIds: [] },
      ...queues('tool', 2),
    ]
    const result = circularFillPool('seed', 3, 'tool', pool, 5)
    expect(result).toHaveLength(5)
    expect(result.some((p) => p.contentId === 'vacio')).toBe(false)
  })

  it('devuelve vacío sin contenidos o con cuota 0', () => {
    expect(circularFillPool('seed', 0, 'tool', [], 4)).toEqual([])
    expect(circularFillPool('seed', 0, 'tool', queues('tool', 3), 0)).toEqual(
      [],
    )
  })

  it('con un único contenido repite ese contenido (no hay alternativa) sin colgarse', () => {
    const result = circularFillPool('seed', 2, 'tool', queues('tool', 1, 2), 4)
    expect(result).toHaveLength(4)
    expect(new Set(contentIds(result)).size).toBe(1)
  })
})

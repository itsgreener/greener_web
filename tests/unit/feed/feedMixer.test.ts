import { describe, it, expect } from 'vitest'
import { generateRound } from '@/modules/feed/domain/generateRound'
import { orderCasePins } from '@/modules/feed/domain/caseStream'
import { buildTypeSkeleton } from '@/modules/feed/domain/typeSkeleton'
import {
  PHONE_BATCH_SIZE,
  resolveBatchSize,
} from '@/modules/feed/domain/batchSize'
import type {
  CaseInput,
  ContentPinQueue,
  FeedConfig,
  FeedSnapshot,
} from '@/modules/feed/domain/types'

const CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  batchSize: 40,
}

function queues(prefix: string, count: number, pins = 1): ContentPinQueue[] {
  return Array.from({ length: count }, (_, i) => ({
    contentId: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    pinIds: Array.from(
      { length: pins },
      (_, k) => `${prefix}-${String(i + 1).padStart(3, '0')}-pin-${k + 1}`,
    ),
  }))
}

/** Escenario real que pidió Greener: 150 casos (fuerza 1-5), 50 tools, 20 insights, 40 episodios, 7 other. */
function realisticSnapshot(): FeedSnapshot {
  return {
    cases: queues('case', 150, 3).map((c, i) => ({ ...c, force: (i % 5) + 1 })),
    insights: queues('insight', 20),
    tools: queues('tool', 50),
    channel: queues('episode', 40),
    other: queues('other', 7),
  }
}

function longestRun(kinds: string[]): number {
  let best = 0
  let run = 0
  kinds.forEach((kind, i) => {
    run = i > 0 && kind === kinds[i - 1] ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

describe('generateRound — escenario real (150 casos, 50 tools, 20 insights, 40 episodios, 7 other)', () => {
  const snapshot = realisticSnapshot()

  it('ningún tramo de la ronda es de un solo tipo: la racha máxima de insights/tools/episodios/other es 1', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      for (let round = 0; round < 3; round++) {
        const { sequence } = generateRound(snapshot, CONFIG, seed, round)
        const minority = sequence.map((p) =>
          p.kind === 'case' ? 'case' : p.kind,
        )
        for (let i = 1; i < minority.length; i++) {
          if (minority[i] !== 'case') {
            expect(minority[i - 1]).toBe('case')
          }
        }
        // Y la racha de casos es corta: no hay colas de un solo tipo.
        expect(longestRun(minority)).toBeLessThanOrEqual(6)
      }
    }
  })

  it('la ronda conserva las proporciones pedidas (70 % casos) y cada caso aporta tantos pines como su fuerza', () => {
    const { sequence, report } = generateRound(snapshot, CONFIG, 'seed', 0)
    const casePins = report.actualCounts.case

    expect(casePins).toBe(snapshot.cases.reduce((n, c) => n + c.force, 0))
    expect(casePins / report.totalPins).toBeGreaterThan(0.69)
    expect(casePins / report.totalPins).toBeLessThan(0.71)
    for (const c of snapshot.cases) {
      expect(sequence.filter((p) => p.contentId === c.contentId)).toHaveLength(
        c.force,
      )
    }
  })

  it('un visitante no ve ningún caso repetido en sus primeros 100 pines', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const { sequence } = generateRound(snapshot, CONFIG, seed, 0)
      const cases = sequence
        .slice(0, 100)
        .filter((p) => p.kind === 'case')
        .map((p) => p.contentId)
      expect(new Set(cases).size).toBe(cases.length)
    }
  })

  it('la fuerza pesa: los casos de fuerza 5 salen mucho más a menudo que los de fuerza 1 al principio de la ronda', () => {
    let f1 = 0
    let f5 = 0
    const seeds = Array.from({ length: 40 }, (_, i) => `seed-${i}`)
    for (const seed of seeds) {
      const first = generateRound(snapshot, CONFIG, seed, 0).sequence.slice(
        0,
        100,
      )
      for (const pin of first) {
        const c = snapshot.cases.find((x) => x.contentId === pin.contentId)
        if (c?.force === 1) f1++
        if (c?.force === 5) f5++
      }
    }
    expect(f5).toBeGreaterThan(f1 * 3)
  })

  it('el tamaño de la ronda y la generación son acotados', () => {
    const start = Date.now()
    const { sequence } = generateRound(snapshot, CONFIG, 'seed', 0)
    expect(Date.now() - start).toBeLessThan(500)
    expect(sequence.length).toBeLessThan(800)
  })
})

describe('orderCasePins — modelo estratificado', () => {
  const cases: CaseInput[] = [
    ...queues('c1', 20).map((c) => ({ ...c, force: 1 })),
    ...queues('c4', 20, 4).map((c) => ({ ...c, force: 4 })),
  ]

  it('es determinista y no depende del orden en que llegan los casos', () => {
    const a = orderCasePins('seed', 0, cases)
    const b = orderCasePins('seed', 0, [...cases].reverse())
    expect(a).toEqual(b)
  })

  it('cada caso aporta tantos pines como su fuerza', () => {
    const stream = orderCasePins('seed', 2, cases)
    for (const c of cases) {
      expect(stream.filter((p) => p.contentId === c.contentId)).toHaveLength(
        c.force,
      )
    }
  })

  it('los pines de un caso de fuerza alta se reparten por toda la cola, no se agrupan', () => {
    const stream = orderCasePins('seed', 0, cases)
    const positions = stream
      .map((p, i) => (p.contentId === 'c4-001' ? i : -1))
      .filter((i) => i >= 0)

    expect(positions).toHaveLength(4)
    for (let i = 1; i < positions.length; i++) {
      // Entre dos apariciones hay, de media, ~1/4 de la cola.
      expect(positions[i] - positions[i - 1]).toBeGreaterThan(5)
    }
  })

  it('el hueco entre apariciones es proporcional a 1/fuerza', () => {
    const stream = orderCasePins('seed', 0, cases)
    const gaps = (prefix: string) => {
      const out: number[] = []
      for (const c of cases.filter((x) => x.contentId.startsWith(prefix))) {
        const pos = stream
          .map((p, i) => (p.contentId === c.contentId ? i : -1))
          .filter((i) => i >= 0)
        for (let i = 1; i < pos.length; i++) out.push(pos[i] - pos[i - 1])
      }
      return out
    }
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

    // Fuerza 1 no tiene hueco interno; se compara contra la longitud de la cola.
    expect(avg(gaps('c4'))).toBeLessThan(stream.length / 3)
    expect(avg(gaps('c4'))).toBeGreaterThan(stream.length / 8)
  })

  it('marca como «force» los pines que superan los pines reales del caso', () => {
    const stream = orderCasePins('seed', 0, [
      { contentId: 'solo', pinIds: ['p1', 'p2'], force: 5 },
    ])
    expect(stream).toHaveLength(5)
    expect(stream.filter((p) => p.repeat === 'force')).toHaveLength(3)
    expect(stream.filter((p) => p.repeat === 'none')).toHaveLength(2)
  })

  it('ignora los casos sin pines y devuelve vacío sin casos', () => {
    expect(orderCasePins('seed', 0, [])).toEqual([])
    expect(
      orderCasePins('seed', 0, [{ contentId: 'x', pinIds: [], force: 3 }]),
    ).toEqual([])
  })
})

describe('buildTypeSkeleton', () => {
  const count = (kinds: string[], kind: string) =>
    kinds.filter((k) => k === kind).length

  it('respeta las cuotas exactas de cada tipo', () => {
    const q = { case: 40, insight: 8, tool: 3, channel: 2, other: 1 }
    const sk = buildTypeSkeleton(q, 'seed', 0)
    expect(sk).toHaveLength(54)
    for (const kind of Object.keys(q) as (keyof typeof q)[]) {
      expect(count(sk, kind)).toBe(q[kind])
    }
  })

  it('versión fuerte: empieza y acaba en caso, y los no-casos nunca van juntos', () => {
    const sk = buildTypeSkeleton(
      { case: 30, insight: 6, tool: 4, channel: 4, other: 2 },
      'seed',
      1,
    )
    expect(sk[0]).toBe('case')
    expect(sk[sk.length - 1]).toBe('case')
    for (let i = 1; i < sk.length; i++) {
      expect(sk[i] !== 'case' && sk[i - 1] !== 'case').toBe(false)
    }
  })

  it('versión débil (pocos casos): evita el mismo tipo minoritario seguido mientras haya alternativa', () => {
    const sk = buildTypeSkeleton(
      { case: 2, insight: 3, tool: 3, channel: 0, other: 0 },
      'seed',
      0,
    )
    expect(sk).toHaveLength(8)
    for (let i = 1; i < sk.length; i++) {
      expect(sk[i] === sk[i - 1] && sk[i] !== 'case').toBe(false)
    }
  })

  it('con un único tipo devuelve ese tipo repetido (no hay alternativa)', () => {
    expect(
      buildTypeSkeleton(
        { case: 0, insight: 4, tool: 0, channel: 0, other: 0 },
        'seed',
        0,
      ),
    ).toEqual(['insight', 'insight', 'insight', 'insight'])
    expect(
      buildTypeSkeleton(
        { case: 3, insight: 0, tool: 0, channel: 0, other: 0 },
        'seed',
        0,
      ),
    ).toEqual(['case', 'case', 'case'])
  })

  it('cambia de una ronda a otra y de una seed a otra', () => {
    const q = { case: 30, insight: 6, tool: 4, channel: 4, other: 2 }
    const a = buildTypeSkeleton(q, 'seed', 0).join()
    expect(buildTypeSkeleton(q, 'seed', 1).join()).not.toBe(a)
    expect(buildTypeSkeleton(q, 'otra', 0).join()).not.toBe(a)
  })
})

describe('resolveBatchSize', () => {
  it('sin petición válida usa el configurado', () => {
    expect(resolveBatchSize(null, 40)).toBe(40)
    expect(resolveBatchSize(undefined, 40)).toBe(40)
    expect(resolveBatchSize(0, 40)).toBe(40)
    expect(resolveBatchSize(-2, 40)).toBe(40)
    expect(resolveBatchSize(2.5, 40)).toBe(40)
  })

  it('el cliente puede pedir menos, nunca más', () => {
    expect(resolveBatchSize(PHONE_BATCH_SIZE, 40)).toBe(20)
    expect(resolveBatchSize(1000, 40)).toBe(40)
  })

  it('una configuración no válida degrada a 1 en lugar de romper', () => {
    expect(resolveBatchSize(null, 0)).toBe(1)
    expect(resolveBatchSize(null, Number.NaN)).toBe(1)
  })
})

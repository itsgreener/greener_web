import { describe, it, expect } from 'vitest'
import { generateRound } from '@/modules/feed/domain/generateRound'
import type { FeedConfig, FeedSnapshot } from '@/modules/feed/domain/types'

const CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 10, tools: 10, channel: 10, other: 0 },
  batchSize: 40,
}

const EMPTY_SNAPSHOT: FeedSnapshot = {
  cases: [],
  insights: [],
  tools: [],
  channel: [],
  other: [],
}

/**
 * Subhomes (arquitectura §8.2: "en subhomes, el 100% de los contenidos
 * del scope forma el universo") no tienen ningún caso en el universo —
 * el tamaño de tanda ya no puede derivarse de ellos (brief §4.4, la
 * fórmula normal). Antes del 15 sep esto colapsaba total=0 siempre:
 * generateRound nunca devolvía nada para un universo sin casos, aunque
 * hubiera contenido real de sobra de otro tipo.
 */
describe('generateRound — universos sin casos (subhomes)', () => {
  it('con solo insights (sin ningún caso), la tanda es una vuelta por los contenidos en vez de colapsar a 0', () => {
    const snapshot: FeedSnapshot = {
      ...EMPTY_SNAPSHOT,
      insights: [
        { contentId: 'insight-1', pinIds: ['pin-1'] },
        { contentId: 'insight-2', pinIds: ['pin-2'] },
        { contentId: 'insight-3', pinIds: ['pin-3'] },
      ],
    }

    const { sequence, report } = generateRound(snapshot, CONFIG, 'seed', 0)

    expect(sequence.length).toBeGreaterThan(0)
    expect(sequence.every((pin) => pin.kind === 'insight')).toBe(true)
    expect(report.totalPins).toBe(sequence.length)
  })

  it('con solo tools, el 100% de la tanda son tools — nada de casos ni de otros tipos', () => {
    const snapshot: FeedSnapshot = {
      ...EMPTY_SNAPSHOT,
      tools: [
        { contentId: 'tool-1', pinIds: ['pin-1'] },
        { contentId: 'tool-2', pinIds: ['pin-2'] },
      ],
    }

    const { sequence } = generateRound(snapshot, CONFIG, 'seed', 0)

    expect(sequence.length).toBeGreaterThan(0)
    expect(sequence.every((pin) => pin.kind === 'tool')).toBe(true)
  })

  it('sin ningún contenido de ningún tipo (universo vacío de verdad), la tanda sigue siendo 0', () => {
    const { sequence, report } = generateRound(
      EMPTY_SNAPSHOT,
      CONFIG,
      'seed',
      0,
    )

    expect(sequence).toHaveLength(0)
    expect(report.totalPins).toBe(0)
  })

  it('es determinista: misma seed y misma ronda para un universo de subhome producen siempre la misma secuencia', () => {
    const snapshot: FeedSnapshot = {
      ...EMPTY_SNAPSHOT,
      channel: [
        { contentId: 'ep-1', pinIds: ['pin-1'] },
        { contentId: 'ep-2', pinIds: ['pin-2'] },
      ],
    }

    const a = generateRound(snapshot, CONFIG, 'misma-seed', 0)
    const b = generateRound(snapshot, CONFIG, 'misma-seed', 0)

    expect(a.sequence).toEqual(b.sequence)
  })
})

/**
 * Tamaño de la ronda con casos (11 nov 2026). El 10 nov se había puesto un
 * suelo según el número de CONTENIDOS que no son caso (`Math.max(...,
 * nonCaseContentCount, ...)`): con pocos casos la ronda se quedaba en ~10 %
 * casos y ~55 % insights. La fórmula vuelve a salir solo de los casos.
 */
describe('generateRound — tamaño de la ronda con casos', () => {
  const pinQueues = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      contentId: `${prefix}-${String(i + 1).padStart(3, '0')}`,
      pinIds: [`${prefix}-${i + 1}-a`, `${prefix}-${i + 1}-b`],
    }))

  /** Catálogo real del 11 nov: 3 insights, 23 tools, 40 episodios (home, sin other). */
  const catalog = (caseCount: number, force = 1): FeedSnapshot => ({
    cases: pinQueues('case', caseCount).map((c) => ({ ...c, force })),
    insights: pinQueues('insight', 3),
    tools: pinQueues('tool', 23),
    channel: pinQueues('episode', 40),
    other: [],
  })

  it('10 casos de fuerza 1 dan una ronda de ceil(10 / 0,7) = 15 pines con los 10 casos dentro', () => {
    const { sequence, report } = generateRound(catalog(10), CONFIG, 'seed', 0)

    expect(report.totalPins).toBe(15)
    expect(sequence).toHaveLength(15)
    expect(report.actualCounts.case).toBe(10)
    expect(
      sequence
        .filter((p) => p.kind === 'case')
        .map((p) => p.contentId)
        .sort(),
    ).toEqual(
      Array.from(
        { length: 10 },
        (_, i) => `case-${String(i + 1).padStart(3, '0')}`,
      ),
    )
  })

  it('el tamaño sale solo de los pines de caso, con independencia de cuántos contenidos haya de los demás tipos', () => {
    const grande = catalog(10)
    const enorme: FeedSnapshot = {
      ...grande,
      tools: pinQueues('tool', 300),
      channel: pinQueues('episode', 500),
    }

    expect(generateRound(grande, CONFIG, 'seed', 0).report.totalPins).toBe(15)
    expect(generateRound(enorme, CONFIG, 'seed', 0).report.totalPins).toBe(15)
  })

  it('con cualquier número de casos y fuerza, totalPins = ceil(pinesDeCasos / 0,70)', () => {
    for (const caseCount of [1, 2, 3, 5, 10, 20, 50, 100]) {
      for (const force of [1, 3, 5]) {
        const snapshot = catalog(caseCount, force)
        const casePins = caseCount * force
        const { report } = generateRound(snapshot, CONFIG, 'seed', 0)

        expect(report.totalPins).toBe(Math.ceil(casePins / 0.7))
        expect(report.actualCounts.case).toBe(casePins)
      }
    }
  })

  it('con 100 casos de fuerza 3 el reparto es 70/10/10/10 (casos, insights, tools, episodios)', () => {
    const { report } = generateRound(catalog(100, 3), CONFIG, 'seed', 0)
    const share = (n: number) => n / report.totalPins

    expect(share(report.actualCounts.case)).toBeGreaterThan(0.699)
    expect(share(report.actualCounts.case)).toBeLessThan(0.701)
    for (const kind of ['insight', 'tool', 'channel'] as const) {
      expect(share(report.actualCounts[kind])).toBeGreaterThan(0.098)
      expect(share(report.actualCounts[kind])).toBeLessThan(0.102)
    }
    expect(report.actualCounts.other).toBe(0)
  })

  it('con ronda pequeña (10 casos), promediando entre sesiones los tres tipos pesan lo mismo', () => {
    const totals = { insight: 0, tool: 0, channel: 0 }
    const seeds = Array.from({ length: 120 }, (_, i) => `sesion-${i}`)
    for (const seed of seeds) {
      const { report } = generateRound(catalog(10), CONFIG, seed, 0)
      totals.insight += report.actualCounts.insight
      totals.tool += report.actualCounts.tool
      totals.channel += report.actualCounts.channel
    }
    const mean = (totals.insight + totals.tool + totals.channel) / 3

    for (const total of Object.values(totals)) {
      expect(Math.abs(total - mean) / mean).toBeLessThan(0.1)
    }
  })

  it('la cuota de cada tipo es la misma en todas las rondas de una sesión (el ciclo la necesita)', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const counts = Array.from(
        { length: 8 },
        (_, round) =>
          generateRound(catalog(10), CONFIG, seed, round).report.actualCounts,
      )
      for (const c of counts) expect(c).toEqual(counts[0])
    }
  })

  it('`other` con ratio 0 no entra en la ronda aunque el snapshot lo traiga', () => {
    const snapshot: FeedSnapshot = {
      ...catalog(10),
      other: pinQueues('other', 7),
    }
    const { sequence } = generateRound(snapshot, CONFIG, 'seed', 0)

    expect(sequence.some((p) => p.kind === 'other')).toBe(false)
  })

  it('aunque cada ronda sea corta, tras varias rondas salen TODOS los insights, tools y episodios', () => {
    // Es lo que permite no reservar sitio para todo en una sola ronda: el
    // ciclo de cada tipo sigue de una ronda a la siguiente.
    for (const seed of ['a', 'b', 'c']) {
      const seen = new Set<string>()
      for (let round = 0; round < 60; round++) {
        for (const pin of generateRound(catalog(10), CONFIG, seed, round)
          .sequence) {
          if (pin.kind !== 'case') seen.add(pin.contentId)
        }
      }
      expect(seen.size).toBe(3 + 23 + 40)
    }
  })

  it('sin casos sigue siendo una vuelta completa por los contenidos del scope', () => {
    const snapshot: FeedSnapshot = {
      ...EMPTY_SNAPSHOT,
      tools: pinQueues('tool', 23),
    }
    const { report } = generateRound(snapshot, CONFIG, 'seed', 0)

    expect(report.totalPins).toBe(23)
  })
})

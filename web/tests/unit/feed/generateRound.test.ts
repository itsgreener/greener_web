import { describe, it, expect } from 'vitest'
import { generateRound } from '@/modules/feed/domain/generateRound'
import type { FeedConfig, FeedSnapshot } from '@/modules/feed/domain/types'

const CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  mixWindow: 20,
  distanceWindow: 10,
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
  it('con solo insights (sin ningún caso), usa batchSize como tamaño de tanda en vez de colapsar a 0', () => {
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

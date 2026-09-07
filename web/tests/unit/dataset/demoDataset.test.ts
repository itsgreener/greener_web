import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateRound } from '@/modules/feed/domain/generateRound'
import type { FeedConfig, FeedSnapshot } from '@/modules/feed/domain/types'

/**
 * Cierra el ciclo: valida que el dataset generado por
 * scripts/generate-demo-data.mjs (50 casos + 9 episodios) es consumible
 * de verdad por el motor de feed real, no solo válido como SQL.
 */
function loadDemoSnapshot(): FeedSnapshot {
  const path = join(process.cwd(), 'data/demo/feed-snapshot.json')
  const raw = JSON.parse(readFileSync(path, 'utf-8'))
  return raw.snapshot as FeedSnapshot
}

const CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  mixWindow: 20,
  distanceWindow: 10,
}

describe('dataset de demostración — integración con el motor de feed real', () => {
  it('generateRound() consume el dataset sin lanzar y produce una tanda coherente', () => {
    const snapshot = loadDemoSnapshot()

    expect(snapshot.cases.length).toBe(50)
    expect(snapshot.channel.length).toBe(9)
    expect(snapshot.insights.length).toBe(0) // se suben manualmente, confirmado
    expect(snapshot.tools.length).toBe(0)

    const { sequence, report } = generateRound(
      snapshot,
      CONFIG,
      'demo-dataset-seed',
      0,
    )

    expect(sequence.length).toBe(report.totalPins)
    expect(sequence.length).toBeGreaterThan(0)

    // Sin insights ni tools reales, ese presupuesto debe redistribuirse
    // (no pedir una cuota imposible — arquitectura §8.2, bug ya corregido).
    expect(report.actualCounts.insight).toBe(0)
    expect(report.actualCounts.tool).toBe(0)
    expect(report.requestedQuotas.insight).toBe(0)
    expect(report.requestedQuotas.tool).toBe(0)

    // Los casos siguen dominando la tanda tal como fija el ratio 70%.
    expect(report.actualCounts.case).toBeGreaterThan(
      report.actualCounts.channel,
    )
  })

  it('varias rondas consecutivas siguen siendo deterministas sobre el dataset real', () => {
    const snapshot = loadDemoSnapshot()
    const a = generateRound(snapshot, CONFIG, 'demo-dataset-seed', 2)
    const b = generateRound(snapshot, CONFIG, 'demo-dataset-seed', 2)
    expect(a.sequence).toEqual(b.sequence)
  })
})

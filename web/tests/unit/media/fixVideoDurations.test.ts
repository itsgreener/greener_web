import { describe, expect, it } from 'vitest'

import {
  parseArgs,
  planDurationFixes,
} from '../../../scripts/fix-video-durations.mjs'

describe('scripts/fix-video-durations.mjs', () => {
  const rows = [
    { id: 'a', publicId: 'v/a', durationSeconds: 10 },
    { id: 'b', publicId: 'v/b', durationSeconds: 10 },
    { id: 'c', publicId: 'v/c', durationSeconds: 5 },
    { id: 'd', publicId: 'v/d', durationSeconds: 10 },
  ]

  it('corrige los 10 falsos, respeta los reales y redondea hacia arriba', () => {
    const { fixes, unknown } = planDurationFixes({
      rows,
      realDurations: new Map([
        ['v/a', 130.73],
        ['v/b', 10], // un 10 real no se toca
        ['v/c', 4.2],
        ['v/d', null],
      ]),
    })

    // c: 4,2 s se guarda como 5, que ya es lo guardado: no hay cambio.
    expect(fixes.map((f) => [f.id, f.newDurationSeconds])).toEqual([['a', 131]])
    expect(unknown.map((r) => r.id)).toEqual(['d'])
  })

  it('un vídeo sin duración real no se modifica', () => {
    const { fixes, unknown } = planDurationFixes({
      rows: [rows[0]],
      realDurations: new Map(),
    })

    expect(fixes).toEqual([])
    expect(unknown).toHaveLength(1)
  })

  it('es una simulación salvo --execute y rechaza opciones desconocidas', () => {
    expect(parseArgs([])).toEqual({ execute: false })
    expect(parseArgs(['--execute'])).toEqual({ execute: true })
    expect(() => parseArgs(['--exceute'])).toThrow(/desconocida/)
  })
})

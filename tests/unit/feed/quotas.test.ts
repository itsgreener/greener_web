import { describe, it, expect } from 'vitest'
import { largestRemainderQuotas } from '@/modules/feed/domain/quotas'
import type { FeedRatios } from '@/modules/feed/domain/types'

const RATIOS: FeedRatios = {
  cases: 70,
  insights: 15,
  tools: 5,
  channel: 5,
  other: 5,
}

describe('largestRemainderQuotas', () => {
  it('la suma de las cuotas es exactamente el remanente pedido', () => {
    for (const remaining of [0, 1, 3, 7, 12, 30, 41, 120]) {
      const quotas = largestRemainderQuotas(remaining, RATIOS)
      const sum = Object.values(quotas).reduce((a, b) => a + b, 0)
      expect(sum).toBe(remaining)
    }
  })

  it('con proporciones exactas reparte sin restos (caso limpio)', () => {
    // Tanda de 40 pines, 70% casos => remanente de 12 para insights/tools/channel/other.
    // Pesos relativos dentro del remanente: insights 15/30, tools 5/30, channel 5/30, other 5/30.
    const quotas = largestRemainderQuotas(12, RATIOS)
    expect(quotas).toEqual({ insights: 6, tools: 2, channel: 2, other: 2 })
  })

  it('remanente 0 devuelve todas las cuotas a 0', () => {
    const quotas = largestRemainderQuotas(0, RATIOS)
    expect(quotas).toEqual({ insights: 0, tools: 0, channel: 0, other: 0 })
  })

  it('ninguna cuota es negativa', () => {
    const quotas = largestRemainderQuotas(13, RATIOS)
    for (const v of Object.values(quotas)) {
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })

  describe('desempate de restos (tieBreak)', () => {
    // Reparto 70/10/10/10 de Greener (11 nov 2026): `other` va por libre.
    const THIRDS: FeedRatios = {
      cases: 70,
      insights: 10,
      tools: 10,
      channel: 10,
      other: 0,
    }

    it('5 pines entre tres tipos iguales: cada valor de tieBreak da la unidad sobrante a dos tipos distintos', () => {
      const results = [0, 1, 2].map((t) => largestRemainderQuotas(5, THIRDS, t))

      for (const q of results) {
        expect(q.insights + q.tools + q.channel).toBe(5)
        expect(q.other).toBe(0)
      }
      // Cada tipo se queda con 1 pin en exactamente uno de los tres desempates.
      for (const kind of ['insights', 'tools', 'channel'] as const) {
        expect(results.filter((q) => q[kind] === 1)).toHaveLength(1)
      }
    })

    it('promediado sobre todas las seeds posibles, 10/10/10 sale exacto aunque la ronda sea pequeña', () => {
      const sums = { insights: 0, tools: 0, channel: 0, other: 0 }
      for (let t = 0; t < 12; t++) {
        const q = largestRemainderQuotas(5, THIRDS, t)
        sums.insights += q.insights
        sums.tools += q.tools
        sums.channel += q.channel
        sums.other += q.other
      }
      // 12 reparto · 5 pines = 60: 20 por tipo.
      expect(sums).toEqual({ insights: 20, tools: 20, channel: 20, other: 0 })
    })

    it('sin empate el desempate no cambia nada, y un tipo con peso 0 nunca recibe unidades', () => {
      for (let t = 0; t < 12; t++) {
        expect(largestRemainderQuotas(12, RATIOS, t)).toEqual({
          insights: 6,
          tools: 2,
          channel: 2,
          other: 2,
        })
        expect(largestRemainderQuotas(7, THIRDS, t).other).toBe(0)
      }
    })
  })
})

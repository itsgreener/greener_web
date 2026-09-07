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
})

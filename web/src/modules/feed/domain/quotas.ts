import type { FeedRatios } from './types'

/** Claves de FeedRatios distintas de "cases" — deliberadamente en plural,
 * igual que los campos de feed_config, y NO acopladas al FeedContentKind
 * singular de un pin (que es "insight"/"tool", no "insights"/"tools"). */
export type QuotaRatioKey = 'insights' | 'tools' | 'channel' | 'other'

/**
 * Método de restos mayores (largest remainder / Hamilton): reparte
 * `remainingTotal` unidades —el hueco que dejan los casos en la tanda,
 * arquitectura §8.2— entre insights/tools/channel/other, según su peso
 * relativo dentro de esos cuatro tipos (normalizado, no el porcentaje bruto
 * sobre el total de la tanda). Garantiza que la suma de las cuotas sea
 * exactamente `remainingTotal`.
 */
export function largestRemainderQuotas(
  remainingTotal: number,
  ratios: FeedRatios,
): Record<QuotaRatioKey, number> {
  const kinds: QuotaRatioKey[] = ['insights', 'tools', 'channel', 'other']
  const nonCaseWeight = kinds.reduce((sum, k) => sum + ratios[k], 0)

  if (remainingTotal <= 0 || nonCaseWeight <= 0) {
    return { insights: 0, tools: 0, channel: 0, other: 0 }
  }

  const rawShares = kinds.map(
    (k) => (remainingTotal * ratios[k]) / nonCaseWeight,
  )
  const floors = rawShares.map(Math.floor)
  const remainders = rawShares.map((v, i) => v - floors[i])

  const assigned = floors.reduce((a, b) => a + b, 0)
  let remaining = Math.round(remainingTotal - assigned)

  // Reparte las unidades sobrantes a quienes tienen el resto más alto.
  const order = kinds
    .map((_, i) => i)
    .sort((a, b) => remainders[b] - remainders[a])

  const quotas = [...floors]
  for (let i = 0; i < order.length && remaining > 0; i++) {
    quotas[order[i]] += 1
    remaining--
  }

  const result = {} as Record<QuotaRatioKey, number>
  kinds.forEach((k, i) => {
    result[k] = quotas[i]
  })
  return result
}

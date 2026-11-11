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
 *
 * Cuando varios tipos empatan en el resto (lo normal con 10/10/10: 5 pines
 * entre tres tipos son 1,67 cada uno), la unidad sobrante NO va siempre a los
 * mismos: `tieBreak` rota quién va primero entre los empatados. `generateRound`
 * lo deriva de la seed de la sesión (módulo 12, que reparte por igual entre 1,
 * 2, 3 o 4 tipos activos), así que la cuota sigue siendo la misma en todas las
 * rondas de una sesión (el ciclo de `circularFillPool` lo necesita) pero, entre
 * visitantes, cada tipo se lleva la unidad extra por igual.
 */
export function largestRemainderQuotas(
  remainingTotal: number,
  ratios: FeedRatios,
  tieBreak = 0,
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

  // Reparte las unidades sobrantes a quienes tienen el resto más alto; los
  // empates se resuelven rotando el orden según `tieBreak`, solo entre los
  // tipos con peso (uno con peso 0 nunca recibe unidades), para que la
  // rotación sea uniforme entre ellos.
  const active = kinds.map((_, i) => i).filter((i) => ratios[kinds[i]] > 0)
  const rotated = (i: number) =>
    (active.indexOf(i) + tieBreak) % Math.max(1, active.length)
  const order = kinds
    .map((_, i) => i)
    .sort((a, b) => remainders[b] - remainders[a] || rotated(a) - rotated(b))

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

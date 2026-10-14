import { deriveRng, type Rng } from './prng'
import type { FeedContentKind } from './types'

export type Quotas = Record<FeedContentKind, number>

const KINDS: FeedContentKind[] = ['case', 'insight', 'tool', 'channel', 'other']

const NOISE = 0.05

/**
 * Elige, para `count` posiciones, el orden de los tipos `kinds` repartiéndolos
 * de forma uniforme según su cuota: en cada posición va el tipo al que más le
 * falta respecto a su cuota acumulada ideal (`cuota · (t+1) / count`), con un
 * ruido pequeño de la seed para desempatar. Ningún tipo se «gasta» antes de
 * tiempo, así que ningún tramo de la ronda queda con un solo tipo.
 */
function spreadKinds(
  quotas: Partial<Record<FeedContentKind, number>>,
  rng: Rng,
  forbidAfter?: (
    kind: FeedContentKind,
    last: FeedContentKind | undefined,
  ) => boolean,
): FeedContentKind[] {
  const kinds = KINDS.filter((k) => (quotas[k] ?? 0) > 0)
  const count = kinds.reduce((sum, k) => sum + (quotas[k] ?? 0), 0)
  const placed: Partial<Record<FeedContentKind, number>> = {}
  const out: FeedContentKind[] = []

  for (let t = 0; t < count; t++) {
    const last = out[t - 1]
    const candidates = kinds
      .filter((k) => (placed[k] ?? 0) < (quotas[k] ?? 0))
      .map((k) => ({
        kind: k,
        score:
          ((quotas[k] ?? 0) * (t + 1)) / count -
          (placed[k] ?? 0) +
          rng() * NOISE,
      }))
      .sort((a, b) => b.score - a.score)

    const choice =
      candidates.find((c) => !forbidAfter?.(c.kind, last)) ?? candidates[0]

    out.push(choice.kind)
    placed[choice.kind] = (placed[choice.kind] ?? 0) + 1
  }

  return out
}

/**
 * Esqueleto de la ronda: el tipo de contenido de cada posición, antes de
 * decidir qué contenido concreto va en cada una.
 *
 * Reglas (decisión de Greener, 14 oct 2026):
 *
 * - Cada tipo ocupa posiciones repartidas de forma uniforme por toda la
 *   ronda, según su cuota.
 * - Ningún pin de un tipo minoritario (todo salvo los casos) va seguido de
 *   otro del mismo tipo. No hay ninguna regla de separación entre pines del
 *   mismo contenido.
 *
 * Cuando los casos son más que todo lo demás junto (lo normal: 70 %) se cumple
 * la versión fuerte, y por construcción: los pines que no son casos se
 * colocan, uno por hueco, en huecos distintos ENTRE casos, repartidos a
 * intervalos regulares. Así la ronda empieza y termina SIEMPRE con un caso (la
 * frontera con la ronda anterior y la siguiente nunca junta dos no-casos) y
 * ningún no-caso va pegado a otro, sea del tipo que sea.
 *
 * Si no hay casos suficientes (subhomes, o el catálogo de antes de publicar)
 * se reparte lo mejor posible evitando el mismo tipo seguido; con un único
 * tipo es imposible y no se intenta.
 */
export function buildTypeSkeleton(
  quotas: Quotas,
  seed: string,
  roundIndex: number,
): FeedContentKind[] {
  const rng = deriveRng(seed, 'skeleton', roundIndex)
  const caseCount = quotas.case
  const minority: Partial<Record<FeedContentKind, number>> = {
    insight: quotas.insight,
    tool: quotas.tool,
    channel: quotas.channel,
    other: quotas.other,
  }
  const minorityCount = KINDS.reduce(
    (sum, k) => (k === 'case' ? sum : sum + (quotas[k] ?? 0)),
    0,
  )

  if (minorityCount === 0) {
    return Array.from({ length: caseCount }, () => 'case' as const)
  }

  const innerGaps = caseCount - 1

  if (innerGaps >= minorityCount) {
    // Versión fuerte: un no-caso por hueco entre casos, huecos distintos.
    const order = spreadKinds(minority, rng)
    const phase = rng()
    const step = innerGaps / minorityCount
    const slots = new Map<number, FeedContentKind>()

    order.forEach((kind, i) => {
      slots.set(Math.floor((i + phase) * step), kind)
    })

    const sequence: FeedContentKind[] = []
    for (let gap = 0; gap < caseCount; gap++) {
      sequence.push('case')
      const kind = slots.get(gap)
      if (kind) sequence.push(kind)
    }
    return sequence
  }

  // Versión débil: reparto por déficit evitando el mismo tipo minoritario seguido.
  return spreadKinds(
    quotas,
    rng,
    (kind, last) => kind !== 'case' && kind === last,
  )
}

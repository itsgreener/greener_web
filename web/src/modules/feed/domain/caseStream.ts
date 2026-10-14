import { deriveRng, hashToSeed } from './prng'
import { rotateCasePins } from './rotateQueue'
import type { CaseInput, GeneratedPin } from './types'

/**
 * Cola de pines de caso de una ronda, con la fuerza como PESO (decisión de
 * Greener, 14 oct 2026: modelo «estratificado»).
 *
 * Un caso de fuerza `f` aporta `f` pines a la ronda y se reparten a
 * intervalos regulares por TODA la cola de casos, no en bloque: la aparición
 * `k` (0…f-1) de un caso lleva la clave `(k + u) / f`, y la cola es el orden
 * por clave. Consecuencias:
 *
 * - la probabilidad de ver un caso en cualquier tramo de la ronda es
 *   proporcional a su fuerza (fuerza 5 aparece ~5 veces más que fuerza 1);
 * - dos pines del mismo caso quedan separados por ~1/f de la ronda, nunca
 *   seguidos mientras haya otros casos con los que alternar;
 * - no hay «el caso de fuerza 5 acapara el principio»: cada caso reparte sus
 *   apariciones por toda la ronda.
 *
 * `u` es el desfase del caso: fijo por sesión y caso (`hash(seed, contentId)`)
 * más una pequeña variación por ronda (±0,25). Fijo para que el hueco entre
 * apariciones se mantenga al cruzar de una ronda a la siguiente (el último
 * pin de la ronda r y el primero de la r+1 quedan a ≥ 0,5/f de ronda); con
 * variación para que el orden no se repita idéntico de una ronda a otra.
 *
 * Determinista: depende solo de la seed, la ronda y los casos (en orden
 * canónico por `contentId`, porque el orden del catálogo no es estable).
 */
export function orderCasePins(
  seed: string,
  roundIndex: number,
  cases: readonly CaseInput[],
): GeneratedPin[] {
  const canonical = [...cases].sort((a, b) =>
    a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0,
  )

  const keyed: {
    key: number
    contentId: string
    k: number
    pin: GeneratedPin
  }[] = []

  for (const c of canonical) {
    const rotated = rotateCasePins(seed, roundIndex, c)
    if (rotated.length === 0) continue

    const base =
      (hashToSeed(seed, 'case-offset', c.contentId) % 1_000_000) / 1_000_000
    const jitter =
      (deriveRng(seed, 'case-jitter', roundIndex, c.contentId)() - 0.5) * 0.5
    const f = rotated.length

    rotated.forEach((rp, k) => {
      keyed.push({
        key: (k + base + jitter) / f,
        contentId: c.contentId,
        k,
        pin: {
          pinId: rp.pinId,
          contentId: c.contentId,
          kind: 'case',
          repeat: rp.repeated ? 'force' : 'none',
        },
      })
    })
  }

  keyed.sort(
    (a, b) =>
      a.key - b.key ||
      (a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0) ||
      a.k - b.k,
  )

  return keyed.map((entry) => entry.pin)
}

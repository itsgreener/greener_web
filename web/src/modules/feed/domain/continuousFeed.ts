import { generateRound } from './generateRound'
import type { FeedConfig, FeedSnapshot, GeneratedPin } from './types'

/**
 * El feed no termina (brief §4.6): cuando se agota una tanda empieza otra,
 * con la misma seed pero roundIndex+1. Esta función concatena tandas
 * consecutivas hasta cubrir el rango [startIndex, startIndex+count) sin
 * exponer al llamante el concepto de "ronda" — solo un índice continuo de
 * pin, que es lo que necesita paginar un cursor de scroll infinito (§8.5).
 *
 * Pura: no cachea entre llamadas (el cacheo, si hace falta por rendimiento,
 * es responsabilidad de infrastructure/application, no de domain — §24.4).
 */
export function getPinsInRange(
  snapshot: FeedSnapshot,
  config: FeedConfig,
  seed: string,
  startIndex: number,
  count: number,
): { items: GeneratedPin[]; roundsUsed: number } {
  const items: GeneratedPin[] = []
  let roundIndex = 0
  let cursor = 0

  // Cota de seguridad: si el universo está vacío, generateRound devuelve
  // tandas de longitud 0 indefinidamente — sin este límite el bucle no
  // terminaría nunca.
  const MAX_ROUNDS = 500

  while (cursor < startIndex + count && roundIndex < MAX_ROUNDS) {
    const { sequence } = generateRound(snapshot, config, seed, roundIndex)
    if (sequence.length === 0) break // universo vacío: no hay nada que servir

    for (const pin of sequence) {
      if (cursor >= startIndex && cursor < startIndex + count) {
        items.push(pin)
      }
      cursor++
    }
    roundIndex++
  }

  return { items, roundsUsed: roundIndex }
}

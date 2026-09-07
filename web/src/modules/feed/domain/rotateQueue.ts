import type {
  CaseInput,
  ContentPinQueue,
  GeneratedPin,
  FeedContentKind,
} from './types'
import { hashToSeed } from './prng'

interface RotatedPin {
  pinId: string
  relaxationLevel: 0 | 4
}

/**
 * Selecciona `force` pines de la cola de un caso para esta tanda, rotando
 * sin repetir hasta agotar la cola (brief §4.3). El offset combina la seed
 * de sesión (punto de partida distinto por sesión) con la ronda (avance
 * determinista `force * roundIndex` posiciones cada tanda).
 *
 * Si `force` supera el número de pines disponibles, el caso repite pines
 * dentro de la misma tanda (brief §4.3) — esas repeticiones se marcan con
 * relaxationLevel 4 para que queden reflejadas en el informe (§8.6).
 */
export function rotateCasePins(
  seed: string,
  roundIndex: number,
  input: CaseInput,
): RotatedPin[] {
  const { pinIds, force, contentId } = input
  if (pinIds.length === 0) return []

  const startSeed = hashToSeed(seed, contentId) % pinIds.length
  const offset = (startSeed + force * roundIndex) % pinIds.length

  const selected: RotatedPin[] = []
  for (let i = 0; i < force; i++) {
    selected.push({
      pinId: pinIds[(offset + i) % pinIds.length],
      relaxationLevel: i >= pinIds.length ? 4 : 0,
    })
  }
  return selected
}

/**
 * Rellena una cuota de pines para un tipo de contenido (insights, tools,
 * channel, other) recorriendo sus contenidos en round-robin y avanzando la
 * cola circular de cada uno, para no agotar siempre el mismo contenido
 * primero (arquitectura §8.2: "no se repite un pin dentro de la tanda si
 * existe otro disponible").
 */
export function circularFillPool(
  seed: string,
  roundIndex: number,
  kind: FeedContentKind,
  pool: ContentPinQueue[],
  quota: number,
): GeneratedPin[] {
  if (pool.length === 0 || quota <= 0) return []

  // Punteros de rotación por contenido, derivados de la seed + ronda, para
  // que sesiones distintas empiecen en puntos distintos de cada cola.
  const pointers = new Map<string, number>()
  for (const content of pool) {
    const start =
      content.pinIds.length > 0
        ? hashToSeed(seed, content.contentId) % content.pinIds.length
        : 0
    pointers.set(
      content.contentId,
      (start + roundIndex) % Math.max(content.pinIds.length, 1),
    )
  }

  const result: GeneratedPin[] = []
  const seenOnceThisRound = new Set<string>() // pinId ya usado en esta tanda

  let poolIndex = 0
  let guard = 0
  // Cota de seguridad: el número de contenidos vacíos no debe producir un
  // bucle infinito si la cuota excede el material disponible real.
  const maxIterations = quota * pool.length + pool.length + 1

  while (result.length < quota && guard < maxIterations) {
    guard++
    const content = pool[poolIndex % pool.length]
    poolIndex++

    if (content.pinIds.length === 0) continue

    const ptr = pointers.get(content.contentId)!
    const candidatePin = content.pinIds[ptr % content.pinIds.length]
    pointers.set(content.contentId, ptr + 1)

    // Evita repetir el mismo pin dos veces en la misma tanda si hay alternativa.
    if (seenOnceThisRound.has(candidatePin) && content.pinIds.length > 1) {
      continue
    }

    seenOnceThisRound.add(candidatePin)
    result.push({
      pinId: candidatePin,
      contentId: content.contentId,
      kind,
      relaxationLevel: 0,
    })
  }

  // Si la cuota supera el material único disponible (catálogo pequeño:
  // 5 insights, 30 tools — arquitectura §22), se completa repitiendo,
  // respetando el resto de la mezcla la separación mínima cuando sea posible.
  if (result.length < quota) {
    let i = 0
    while (result.length < quota && pool.some((c) => c.pinIds.length > 0)) {
      const content = pool[i % pool.length]
      i++
      if (content.pinIds.length === 0) continue
      const ptr = pointers.get(content.contentId)!
      const pin = content.pinIds[ptr % content.pinIds.length]
      pointers.set(content.contentId, ptr + 1)
      result.push({
        pinId: pin,
        contentId: content.contentId,
        kind,
        relaxationLevel: 4,
      })
    }
  }

  return result.slice(0, quota)
}

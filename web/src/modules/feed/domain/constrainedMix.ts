import type { FeedConfig, FeedContentKind, GeneratedPin } from './types'
import type { Rng } from './prng'

export type Pools = Record<FeedContentKind, GeneratedPin[]>

interface RelaxState {
  level: 0 | 1 | 2 | 3 | 4
  distanceStepIndex: 0 | 1 | 2 // solo relevante en level 3 (10 → 8 → 6 → 4)
}

const INITIAL_STATE: RelaxState = { level: 0, distanceStepIndex: 0 }

function escalate(state: RelaxState): RelaxState {
  if (state.level === 0) return { level: 1, distanceStepIndex: 0 }
  if (state.level === 1) return { level: 2, distanceStepIndex: 0 }
  if (state.level === 2) return { level: 3, distanceStepIndex: 0 }
  if (state.level === 3 && state.distanceStepIndex < 2) {
    return {
      level: 3,
      distanceStepIndex: (state.distanceStepIndex + 1) as 0 | 1 | 2,
    }
  }
  return { level: 4, distanceStepIndex: 0 }
}

/** Nivel 3: separación 10 → 8 → 6 → 4 (arquitectura §8.4). */
function distanceSteps(base: number): [number, number, number] {
  return [Math.max(base - 2, 1), Math.max(base - 4, 1), Math.max(base - 6, 1)]
}

function effectiveDistance(state: RelaxState, base: number): number {
  if (state.level <= 2) return base
  if (state.level === 3) return distanceSteps(base)[state.distanceStepIndex]
  return 0 // level 4: sin separación
}

function adjacencyAllowed(state: RelaxState): boolean {
  return state.level >= 2
}

function violatesDistance(
  sequence: GeneratedPin[],
  contentId: string,
  distance: number,
): boolean {
  if (distance <= 0) return false
  const start = Math.max(0, sequence.length - distance)
  for (let i = start; i < sequence.length; i++) {
    if (sequence[i].contentId === contentId) return true
  }
  return false
}

function ratioFor(kind: FeedContentKind, ratios: FeedConfig['ratios']): number {
  switch (kind) {
    case 'case':
      return ratios.cases
    case 'insight':
      return ratios.insights
    case 'tool':
      return ratios.tools
    case 'channel':
      return ratios.channel
    case 'other':
      return ratios.other
  }
}

function deficitScore(
  kind: FeedContentKind,
  sequence: GeneratedPin[],
  config: FeedConfig,
): number {
  const window = Math.min(sequence.length, config.mixWindow)
  const slice = sequence.slice(sequence.length - window)
  const countInWindow = slice.filter((p) => p.kind === kind).length
  const target = (window * ratioFor(kind, config.ratios)) / 100
  return target - countInWindow
}

export interface MixResult {
  sequence: GeneratedPin[]
  relaxationCounts: Record<0 | 1 | 2 | 3 | 4, number>
}

/**
 * Mezcla los pools ya construidos (uno por tipo, ya con la cuota resuelta)
 * en una única secuencia, respetando ventana de proporción, separación por
 * contenido y no-adyacencia — relajando en el orden documentado en §8.4
 * solo cuando no hay forma de continuar sin violarlas.
 */
export function constrainedMix(
  pools: Pools,
  config: FeedConfig,
  rng: Rng,
): MixResult {
  const kinds = (Object.keys(pools) as FeedContentKind[]).filter(
    (k) => pools[k].length > 0,
  )
  const pointers: Record<FeedContentKind, number> = {
    case: 0,
    insight: 0,
    tool: 0,
    channel: 0,
    other: 0,
  }
  const totalPins = kinds.reduce((sum, k) => sum + pools[k].length, 0)

  const sequence: GeneratedPin[] = []
  const relaxationCounts: Record<0 | 1 | 2 | 3 | 4, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  }
  let state = INITIAL_STATE

  // A nivel 4 (sin separación ni adyacencia) siempre se puede colocar el
  // siguiente candidato disponible, así que el bucle termina como muy tarde
  // al alcanzar ese nivel — no hace falta guard adicional de iteraciones.
  while (sequence.length < totalPins) {
    const available = kinds.filter((k) => pointers[k] < pools[k].length)
    if (available.length === 0) break // no debería ocurrir: totalPins ya cuenta solo pools no vacíos

    const scored = available
      .map((kind) => ({
        kind,
        score: deficitScore(kind, sequence, config) + rng() * 0.01,
      }))
      .sort((a, b) => b.score - a.score)

    let placed = false
    for (const { kind } of scored) {
      const candidate = pools[kind][pointers[kind]]
      const okAdjacency =
        adjacencyAllowed(state) ||
        sequence.length === 0 ||
        sequence[sequence.length - 1].kind !== kind
      const distance = effectiveDistance(state, config.distanceWindow)
      const okDistance = !violatesDistance(
        sequence,
        candidate.contentId,
        distance,
      )

      if (okAdjacency && okDistance) {
        pointers[kind]++
        const finalLevel = Math.max(candidate.relaxationLevel, state.level) as
          0 | 1 | 2 | 3 | 4
        sequence.push({ ...candidate, relaxationLevel: finalLevel })
        relaxationCounts[finalLevel]++
        placed = true
        break
      }
    }

    if (!placed) {
      state = escalate(state)
    }
  }

  return { sequence, relaxationCounts }
}

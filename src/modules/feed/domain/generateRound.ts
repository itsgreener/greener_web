
import type {
  FeedConfig,
  FeedSnapshot,
  GenerateRoundResult,
  GeneratedPin,
  FeedContentKind,
  RoundReport,
} from './types'
import { circularFillPool } from './rotateQueue'
import { orderCasePins } from './caseStream'
import { largestRemainderQuotas } from './quotas'
import { buildTypeSkeleton } from './typeSkeleton'

const EMPTY_QUOTAS = {
  insights: 0,
  tools: 0,
  channel: 0,
  other: 0,
}

/**
 * Genera una ronda completa y determinista del feed.
 *
 * 1. Ordena los pines de Cases.
 * 2. Calcula el tamaño de la ronda, evitando que pocos Cases
 *    oculten los demás tipos de contenido.
 * 3. Calcula las cuotas de los otros tipos.
 * 4. Genera las colas de contenido.
 * 5. Construye el esqueleto de distribución.
 * 6. Genera la secuencia definitiva.
 * 7. Devuelve el informe de observabilidad.
 */
export function generateRound(
  snapshot: FeedSnapshot,
  config: FeedConfig,
  seed: string,
  roundIndex: number,
): GenerateRoundResult {
  // 1. Cola de Cases.
  const casePool = orderCasePins(
    seed,
    roundIndex,
    snapshot.cases,
  )

  const totalCasePins = casePool.length

  // 2. Tamaño de la ronda.
  const nonCaseContentCount =
    snapshot.insights.length +
    snapshot.tools.length +
    snapshot.channel.length +
    snapshot.other.length

  const caseBasedTotal =
    totalCasePins > 0 && config.ratios.cases > 0
      ? Math.ceil(
          totalCasePins / (config.ratios.cases / 100),
        )
      : 0

  // Garantiza espacio para los contenidos no Case
  // cuando todavía hay pocos Cases publicados.
  const total = Math.max(
    caseBasedTotal,
    nonCaseContentCount,
    totalCasePins,
  )

  // 3. Cuotas de los demás tipos.
  const remaining = total - totalCasePins

  const availableRatios = {
    ...config.ratios,
    insights:
      snapshot.insights.length > 0
        ? config.ratios.insights
        : 0,
    tools:
      snapshot.tools.length > 0
        ? config.ratios.tools
        : 0,
    channel:
      snapshot.channel.length > 0
        ? config.ratios.channel
        : 0,
    other:
      snapshot.other.length > 0
        ? config.ratios.other
        : 0,
  }

  const quotas =
    remaining > 0
      ? largestRemainderQuotas(
          remaining,
          availableRatios,
        )
      : EMPTY_QUOTAS

  // 4. Colas de cada tipo.
  const pools: Record<FeedContentKind, GeneratedPin[]> = {
    case: casePool,

    insight: circularFillPool(
      seed,
      roundIndex,
      'insight',
      snapshot.insights,
      quotas.insights,
    ),

    tool: circularFillPool(
      seed,
      roundIndex,
      'tool',
      snapshot.tools,
      quotas.tools,
    ),

    channel: circularFillPool(
      seed,
      roundIndex,
      'channel',
      snapshot.channel,
      quotas.channel,
    ),

    other: circularFillPool(
      seed,
      roundIndex,
      'other',
      snapshot.other,
      quotas.other,
    ),
  }

  // 5. Esqueleto de distribución.
  const skeleton = buildTypeSkeleton(
    {
      case: pools.case.length,
      insight: pools.insight.length,
      tool: pools.tool.length,
      channel: pools.channel.length,
      other: pools.other.length,
    },
    seed,
    roundIndex,
  )

  // 6. Construcción de la secuencia.
  const pointers: Record<FeedContentKind, number> = {
    case: 0,
    insight: 0,
    tool: 0,
    channel: 0,
    other: 0,
  }

  const sequence = skeleton.map(
    (kind) => pools[kind][pointers[kind]++],
  )

  // 7. Informe de observabilidad.
  const actualCounts: Record<FeedContentKind, number> = {
    case: 0,
    insight: 0,
    tool: 0,
    channel: 0,
    other: 0,
  }

  for (const pin of sequence) {
    actualCounts[pin.kind]++
  }

  const report: RoundReport = {
    totalPins: sequence.length,

    requestedQuotas: {
      case: totalCasePins,
      insight: quotas.insights,
      tool: quotas.tools,
      channel: quotas.channel,
      other: quotas.other,
    },

    actualCounts,

    repeatedPins: {
      quota: sequence.filter(
        (p) => p.repeat === 'quota',
      ).length,

      force: sequence.filter(
        (p) => p.repeat === 'force',
      ).length,
    },
  }

  return {
    sequence,
    report,
  }
}

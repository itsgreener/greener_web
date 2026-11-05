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

const EMPTY_QUOTAS = { insights: 0, tools: 0, channel: 0, other: 0 }

/**
 * Genera la ronda completa, determinista, a partir de un universo de
 * contenidos, configuración, seed y número de ronda (arquitectura §8, Anexo
 * C). Función de dominio pura: misma entrada, siempre la misma salida.
 *
 * La ronda es la «vuelta» completa del feed: se precalcula entera, se guarda
 * (feed_round) y se sirve por lotes (getFeedSessionBatch).
 *
 * Los pasos:
 *
 * 1. Casos: cada uno aporta `fuerza` pines, repartidos por toda la cola de
 *    casos (caseStream.ts).
 * 2. Tamaño de la ronda: con casos, `casos / 0,70`; sin casos (subhomes), una
 *    vuelta completa por los contenidos disponibles.
 * 3. Cuotas de los demás tipos por restos mayores, sobre el hueco que dejan
 *    los casos y con los pesos renormalizados entre esos cuatro tipos.
 * 4. Cola de cada tipo: ciclo sin repetir contenido hasta agotar los de su
 *    tipo (rotateQueue.ts).
 * 5. Esqueleto de tipos: reparto uniforme por toda la ronda con la regla de
 *    vecindad (typeSkeleton.ts).
 * 6. Cada posición toma el siguiente pin de la cola de su tipo.
 */
export function generateRound(
  snapshot: FeedSnapshot,
  config: FeedConfig,
  seed: string,
  roundIndex: number,
): GenerateRoundResult {
  // 1. Cola de casos.
  const casePool = orderCasePins(seed, roundIndex, snapshot.cases)
  const totalCasePins = casePool.length

  // 2. Tamaño total de la ronda. Normalmente lo fijan los casos (brief §4.4).
  // En una subhome sin casos (Insights / Tools / Channel) la ronda es UNA
  // VUELTA COMPLETA por los contenidos disponibles: 16 episodios => 16
  // posiciones. En Home / All, mientras haya casos, se conserva la lógica de
  // porcentajes y fuerza de casos.
  const nonCaseContentCount =
    snapshot.insights.length +
    snapshot.tools.length +
    snapshot.channel.length +
    snapshot.other.length

  const total =
    totalCasePins > 0 && config.ratios.cases > 0
      ? Math.ceil(totalCasePins / (config.ratios.cases / 100))
      : nonCaseContentCount > 0
        ? nonCaseContentCount
        : totalCasePins

  // 3. Cuotas del resto de tipos por restos mayores, sobre el hueco que
  // dejan los casos. Si un tipo no tiene NINGÚN contenido en el universo, su
  // peso se anula antes de repartir (arquitectura §8.2).
  const remaining = total - totalCasePins
  const availableRatios = {
    ...config.ratios,
    insights: snapshot.insights.length > 0 ? config.ratios.insights : 0,
    tools: snapshot.tools.length > 0 ? config.ratios.tools : 0,
    channel: snapshot.channel.length > 0 ? config.ratios.channel : 0,
    other: snapshot.other.length > 0 ? config.ratios.other : 0,
  }
  const quotas =
    remaining > 0
      ? largestRemainderQuotas(remaining, availableRatios)
      : EMPTY_QUOTAS

  // 4. Cola de cada tipo.
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

  // 5. Esqueleto de tipos con las cuotas realmente disponibles.
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

  // 6. Cada posición toma el siguiente pin de la cola de su tipo.
  const pointers: Record<FeedContentKind, number> = {
    case: 0,
    insight: 0,
    tool: 0,
    channel: 0,
    other: 0,
  }
  const sequence = skeleton.map((kind) => pools[kind][pointers[kind]++])

  // 7. Informe de observabilidad (arquitectura §8.6).
  const actualCounts: Record<FeedContentKind, number> = {
    case: 0,
    insight: 0,
    tool: 0,
    channel: 0,
    other: 0,
  }
  for (const pin of sequence) actualCounts[pin.kind]++

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
      quota: sequence.filter((p) => p.repeat === 'quota').length,
      force: sequence.filter((p) => p.repeat === 'force').length,
    },
  }

  return { sequence, report }
}

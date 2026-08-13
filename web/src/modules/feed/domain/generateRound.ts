import type {
  FeedConfig,
  FeedSnapshot,
  GenerateRoundResult,
  GeneratedPin,
  FeedContentKind,
  RoundReport,
} from "./types";
import { rotateCasePins, circularFillPool } from "./rotateQueue";
import { largestRemainderQuotas } from "./quotas";
import { constrainedMix, type Pools } from "./constrainedMix";
import { deriveRng } from "./prng";

const EMPTY_QUOTAS = { insights: 0, tools: 0, channel: 0, other: 0 };

/**
 * Genera una tanda determinista de pines a partir de un universo de
 * contenidos, configuración, seed y número de ronda (arquitectura §8,
 * Anexo C). Función de dominio pura: misma entrada, siempre la misma salida.
 */
export function generateRound(
  snapshot: FeedSnapshot,
  config: FeedConfig,
  seed: string,
  roundIndex: number
): GenerateRoundResult {
  const startedAt = Date.now();

  // 1. Pines de casos para esta tanda (rotación por cola circular + fuerza).
  const casePool: GeneratedPin[] = snapshot.cases.flatMap((c) =>
    rotateCasePins(seed, roundIndex, c).map((rp) => ({
      pinId: rp.pinId,
      contentId: c.contentId,
      kind: "case" as FeedContentKind,
      relaxationLevel: rp.relaxationLevel,
    }))
  );

  const totalCasePins = casePool.length;

  // 2. Tamaño total de la tanda: lo fijan los casos (brief §4.4).
  const total =
    totalCasePins > 0 && config.ratios.cases > 0
      ? Math.ceil(totalCasePins / (config.ratios.cases / 100))
      : totalCasePins;

  // 3. Cuotas del resto de tipos por restos mayores, sobre el hueco que
  // dejan los casos en la tanda (total - totalCasePins), no sobre el total.
  // Si un tipo no tiene NINGÚN contenido en el universo (no solo pocos), su
  // peso se anula antes de repartir: pedirle una cuota imposible de cumplir
  // dejaría requestedQuotas != actualCounts sin motivo real (arquitectura §8.2).
  const remaining = total - totalCasePins;
  const availableRatios = {
    ...config.ratios,
    insights: snapshot.insights.length > 0 ? config.ratios.insights : 0,
    tools: snapshot.tools.length > 0 ? config.ratios.tools : 0,
    channel: snapshot.channel.length > 0 ? config.ratios.channel : 0,
    other: snapshot.other.length > 0 ? config.ratios.other : 0,
  };
  const quotas = remaining > 0 ? largestRemainderQuotas(remaining, availableRatios) : EMPTY_QUOTAS;

  // 4. Relleno de cada pool por cola circular, respetando la cuota.
  const pools: Pools = {
    case: casePool,
    insight: circularFillPool(seed, roundIndex, "insight", snapshot.insights, quotas.insights),
    tool: circularFillPool(seed, roundIndex, "tool", snapshot.tools, quotas.tools),
    channel: circularFillPool(seed, roundIndex, "channel", snapshot.channel, quotas.channel),
    other: circularFillPool(seed, roundIndex, "other", snapshot.other, quotas.other),
  };

  // 5. Mezcla restringida: ventana de proporción, separación, no-adyacencia.
  const rng = deriveRng(seed, "mix", roundIndex);
  const { sequence, relaxationCounts } = constrainedMix(pools, config, rng);

  // 6. Informe de observabilidad (arquitectura §8.6).
  const actualCounts: Record<FeedContentKind, number> = {
    case: 0,
    insight: 0,
    tool: 0,
    channel: 0,
    other: 0,
  };
  for (const pin of sequence) actualCounts[pin.kind]++;

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
    relaxationCounts,
    repeatedContentPins: sequence.filter((p) => p.relaxationLevel >= 4).length,
    durationMs: Date.now() - startedAt,
  };

  return { sequence, report };
}

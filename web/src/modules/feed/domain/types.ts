/**
 * Tipos del motor de feed. Módulo de dominio puro: sin dependencia de
 * Next.js, Supabase ni ningún detalle de infraestructura (arquitectura §24.4).
 */

export type FeedContentKind = 'case' | 'insight' | 'tool' | 'channel' | 'other'

/** Cola de pines de un contenido, en el orden en que deben rotarse. */
export interface ContentPinQueue {
  contentId: string
  pinIds: string[]
}

/** Un caso, con su fuerza (brief §4.3): pines aportados por tanda. */
export interface CaseInput extends ContentPinQueue {
  force: number // 1-5
}

export interface FeedSnapshot {
  cases: CaseInput[]
  insights: ContentPinQueue[]
  tools: ContentPinQueue[]
  channel: ContentPinQueue[]
  other: ContentPinQueue[]
}

/** Porcentajes objetivo por tipo. Deben sumar 100 (arquitectura §8.1). */
export interface FeedRatios {
  cases: number
  insights: number
  tools: number
  channel: number
  other: number
}

export interface FeedConfig {
  ratios: FeedRatios
  mixWindow: number // arquitectura §8.4/§4.5 — ventana de proporción (20)
  distanceWindow: number // separación mínima por contenido (10)
  // Tamaño de tanda objetivo (feed_config.batch_size, §7.5/§8.1). Antes no
  // se usaba en generateRound (los casos fijaban el total solos, brief
  // §4.4) — hace falta como red de seguridad para universos sin casos
  // (subhomes de insight/tool/channel, arquitectura §8.2: "en subhomes, el
  // 100% de los contenidos del scope forma el universo"), donde ya no hay
  // ningún caso del que derivar el tamaño de la tanda.
  batchSize: number
}

export interface GeneratedPin {
  pinId: string
  contentId: string
  kind: FeedContentKind
  /** Nivel de relajación (§8.4) necesario para poder emitir este pin. 0 = sin relajar nada. */
  relaxationLevel: number
}

export interface RoundReport {
  totalPins: number
  requestedQuotas: Record<FeedContentKind, number>
  actualCounts: Record<FeedContentKind, number>
  relaxationCounts: Record<number, number>
  repeatedContentPins: number
  durationMs: number
}

export interface GenerateRoundResult {
  sequence: GeneratedPin[]
  report: RoundReport
}

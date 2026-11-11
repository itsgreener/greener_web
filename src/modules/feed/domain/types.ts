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

/**
 * Porcentajes objetivo por tipo. Deben sumar 100 (arquitectura §8.1).
 *
 * Por defecto 70/10/10/10/0 (decisión de Greener, 11 nov 2026): `other` vale 0
 * porque no entra en la cuota de la ronda, sino que se intercala como
 * interludio según su propio calendario (`interludes.ts`). La clave se
 * conserva para no cambiar el esquema de `feed_config.ratios`.
 */
export interface FeedRatios {
  cases: number
  insights: number
  tools: number
  channel: number
  other: number
}

export interface FeedConfig {
  ratios: FeedRatios
  /**
   * Pines por lote (feed_config.batch_size, 40 por defecto): tamaño máximo de
   * cada respuesta de la API. La ronda se precalcula ENTERA y se sirve por
   * tramos de este tamaño (el cliente puede pedir menos: 20 en teléfono); si
   * la ronda es más corta que el lote (pocos casos), el lote se completa con
   * el principio de la ronda siguiente. No interviene en la generación de la
   * ronda.
   */
  batchSize: number
}

/**
 * Por qué un pin repite algo que ya salió en la ronda:
 * - `none`: no repite.
 * - `quota`: el contenido ya salió en esta ronda porque la cuota de su tipo
 *   supera el número de contenidos del tipo (5 insights para 20 pines).
 * - `force`: la fuerza de un caso supera el número de pines que tiene, así
 *   que repite pin (fuerza 5 con 2 pines).
 * Un caso que sale varias veces con pines distintos NO es una repetición:
 * es justo lo que pide su fuerza.
 */
export type PinRepeat = 'none' | 'quota' | 'force'

export interface GeneratedPin {
  pinId: string
  contentId: string
  kind: FeedContentKind
  repeat: PinRepeat
}

export interface RoundReport {
  totalPins: number
  requestedQuotas: Record<FeedContentKind, number>
  actualCounts: Record<FeedContentKind, number>
  /** Pines que repiten algo ya salido en la ronda, por causa (ver PinRepeat). */
  repeatedPins: { quota: number; force: number }
}

export interface GenerateRoundResult {
  sequence: GeneratedPin[]
  report: RoundReport
}

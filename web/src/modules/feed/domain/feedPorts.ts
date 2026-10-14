import type { FeedDataset, PinDirectoryEntry } from './feedReadModels'
import type { FeedConfig } from './types'

export interface FeedSession {
  id: string
  seed: string
  scope: string
  expiresAt: string
  /**
   * Contenido a excluir del universo de esta sesión (panel de
   * recomendaciones de una página de detalle — no debe recomendarse a sí
   * misma). `null` en toda sesión de home/subhome normal.
   */
  excludeContentId: string | null
}

export interface NewFeedSession {
  scope: string
  filterHash: string | null
  excludeContentId?: string | null
}

/** Persistencia de feed_session/feed_round (arquitectura §8.5). */
export interface FeedSessionRepository {
  create(params: NewFeedSession): Promise<FeedSession>

  get(sessionId: string): Promise<FeedSession | null>

  getRound(sessionId: string, roundIndex: number): Promise<string[] | null>

  /** Una ronda guardada es inmutable (arquitectura §8.5). */
  saveRound(
    sessionId: string,
    roundIndex: number,
    orderedPinIds: string[],
  ): Promise<void>
}

/** Lo publicado, visto desde el feed. */
export interface FeedCatalog {
  /** Universo completo del scope, para generar una ronda nueva. */
  dataset(scope: string, excludeContentId?: string | null): Promise<FeedDataset>

  /** Fichas de unas unidades ya decididas, sin releer el catálogo entero. */
  directoryByIds(unitIds: string[]): Promise<Record<string, PinDirectoryEntry>>

  config(): Promise<FeedConfig>
}

export interface FeedCursorPayload {
  sessionId: string
  roundIndex: number
  // Posición dentro de la ronda (pines ya servidos de ella). 0 = principio.
  offset: number
}

/** Cursor opaco y firmado: el cliente no puede alterar cuotas ni seed. */
export interface FeedCursorCodec {
  encode(payload: FeedCursorPayload): string

  /** null si es inválido, ajeno o está corrupto. */
  decode(cursor: string): FeedCursorPayload | null
}

/** Límites de peticiones del feed público por visitante. */
export interface FeedRequestLimits {
  canCreateSession(visitorId: string): boolean

  canFetchBatch(visitorId: string): boolean

  rememberSession(visitorId: string, sessionId: string, scope: string): void

  getLastSession(visitorId: string, scope: string): string | null
}

import { generateRound } from '@/modules/feed/domain'
import {
  getFeedSessionRow,
  getFeedRound,
  saveFeedRound,
  type FeedSessionRow,
} from '../infrastructure/feedSessionRepository'
import {
  getFeedDataset,
  getFeedConfig,
  getPinDirectoryByIds,
  type FeedItemMedia,
  type PinDirectoryEntry,
} from '../infrastructure/supabaseFeedSource'
import { encodeCursor, decodeCursor } from '../infrastructure/cursor'

export interface FeedBatchItem {
  pinId: string
  contentId: string
  kind: string
  destination: string
  ratio: string
  label: string | null
  cta: string | null
  alt: string
  autoplayMode: 'viewport' | 'hover' | null
  media: FeedItemMedia[]
}

export interface FeedBatchResult {
  items: FeedBatchItem[]
  cursor: string
  round: number
  // El feed no termina (brief §4.6, arquitectura §8.5): siempre hay más
  // mientras el universo tenga al menos un pin publicado.
  hasMore: boolean
}
export class FeedSessionNotFoundError extends Error {
  constructor() {
    super('La sesión de feed no existe o ha caducado.')
    this.name = 'FeedSessionNotFoundError'
  }
}

export class InvalidFeedCursorError extends Error {
  constructor() {
    super('El cursor no es válido para esta sesión.')
    this.name = 'InvalidFeedCursorError'
  }
}

// especificacion-final-formato-detalle.md §7: episode se unifica con
// case bajo /work/[slug] (tipo B) — ya no tiene ruta propia /channel.
function destinationFor(
  contentType: PinDirectoryEntry['contentType'],
  slug: string,
): string {
  switch (contentType) {
    case 'case':
    case 'episode':
      return `/work/${slug}`
    case 'tool':
      return `/tools/${slug}`
    case 'insight':
      return `/insights/${slug}`
    case 'other':
      // especificacion-final-formato-detalle.md §7 (ampliado el 21 sep):
      // prefijo propio en vez de raíz, para no arriesgar colisión con
      // /work, /tools, /insights, /channel, /contact, /admin, /preview
      // — decisión cerrada, ya no es una suposición.
      return `/variety/${slug}`
  }
}

function kindFor(contentType: PinDirectoryEntry['contentType']): string {
  return contentType === 'episode' ? 'channel' : contentType
}

// especificacion-final-formato-detalle.md §1: el CTA del pin en el feed
// es fijo por tipo de contenido, no un texto libre por pin — pin.cta
// desaparece del modelo (§3, "Pin (todos los tipos)" ya no lo lista).
function ctaFor(contentType: PinDirectoryEntry['contentType']): string | null {
  switch (contentType) {
    case 'tool':
      return 'Use'
    case 'insight':
      return 'Read'
    case 'case':
    case 'episode':
    case 'other':
      return 'Watch'
  }
}

function enrich(
  unitIds: string[],
  directory: Record<string, PinDirectoryEntry>,
): FeedBatchItem[] {
  return unitIds.map((unitId) => {
    const meta = directory[unitId]
    if (!meta) {
      throw new Error(
        `Unidad ${unitId} de la ronda no tiene entrada en el directorio — dataset inconsistente.`,
      )
    }
    return {
      pinId: unitId,
      contentId: meta.contentId,
      kind: kindFor(meta.contentType),
      destination: destinationFor(meta.contentType, meta.contentSlug),
      ratio: meta.ratio,
      label: meta.label,
      cta: ctaFor(meta.contentType),
      alt: meta.alt,
      autoplayMode: meta.autoplayMode,
      media: meta.media,
    }
  })
}

export interface GetFeedSessionBatchDeps {
  getSession: (sessionId: string) => Promise<FeedSessionRow | null>
  getRound: (sessionId: string, roundIndex: number) => Promise<string[] | null>
  saveRound: (
    sessionId: string,
    roundIndex: number,
    pinIds: string[],
  ) => Promise<void>
  getDataset: typeof getFeedDataset
  getConfig: typeof getFeedConfig
  getDirectoryByIds: typeof getPinDirectoryByIds
}

const defaultDeps: GetFeedSessionBatchDeps = {
  getSession: getFeedSessionRow,
  getRound: getFeedRound,
  saveRound: saveFeedRound,
  getDataset: getFeedDataset,
  getConfig: getFeedConfig,
  getDirectoryByIds: getPinDirectoryByIds,
}

/**
 * Caso de uso: "dame el siguiente lote de esta sesión de feed" (§16.1,
 * §8.5). Una ronda ya generada se lee tal cual de feed_round (inmutable:
 * los pines ya servidos no cambian aunque cambie el contenido publicado
 * después); una ronda nueva se calcula con generateRound(), el motor de
 * dominio ya probado en la Fase 0, y se persiste antes de devolverla.
 *
 * Hoy cada ronda es un lote completo (arquitectura §8.2: el tamaño de la
 * tanda lo fijan los casos) — por eso el cursor solo necesita
 * roundIndex, sin offset dentro de la ronda.
 */
export async function getFeedSessionBatch(
  sessionId: string,
  cursor: string | null,
  deps: GetFeedSessionBatchDeps = defaultDeps,
): Promise<FeedBatchResult> {
  const session = await deps.getSession(sessionId)
  if (!session) throw new FeedSessionNotFoundError()

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    throw new FeedSessionNotFoundError()
  }

  let roundIndex = 0
  if (cursor) {
    const payload = decodeCursor(cursor)
    if (!payload || payload.sessionId !== sessionId) {
      throw new InvalidFeedCursorError()
    }
    roundIndex = payload.roundIndex
  }

  let unitIds = await deps.getRound(sessionId, roundIndex)
  let directory: Record<string, PinDirectoryEntry>

  if (unitIds) {
    // Ronda ya calculada: solo hace falta enriquecer, no releer el catálogo entero.
    directory = await deps.getDirectoryByIds(unitIds)
  } else {
    // Ronda nueva: hace falta el universo completo para poder generarla,
    // filtrado por el scope con el que se abrió la sesión (§6.1, §8.2).
    const [{ snapshot, pinDirectory }, config] = await Promise.all([
      deps.getDataset(session.scope, session.excludeContentId),
      deps.getConfig(),
    ])
    const { sequence } = generateRound(
      snapshot,
      config,
      session.seed,
      roundIndex,
    )
    unitIds = sequence.map((pin) => pin.pinId)
    await deps.saveRound(sessionId, roundIndex, unitIds)
    directory = pinDirectory
  }

  const items = enrich(unitIds, directory)
 return {
  items,
  cursor: encodeCursor({ sessionId, roundIndex: roundIndex + 1 }),
  round: roundIndex,
  hasMore: true,
}
}

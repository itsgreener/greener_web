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
  type PinDirectoryEntry,
} from '../infrastructure/supabaseFeedSource'
import { encodeCursor, decodeCursor } from '../infrastructure/cursor'

export interface FeedBatchItem {
  pinId: string
  contentId: string
  kind: string
  destination: string
  ratio: string
  label: string
  cta: string | null
  alt: string
  cloudinaryPublicId: string
}

export interface FeedBatchResult {
  items: FeedBatchItem[]
  cursor: string
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

function destinationFor(
  contentType: PinDirectoryEntry['contentType'],
  slug: string,
): string {
  switch (contentType) {
    case 'case':
      return `/work/${slug}`
    case 'episode':
      return `/channel/${slug}`
    case 'tool':
      return `/tools/${slug}`
    case 'insight':
      return `/insights/${slug}`
    case 'page':
      // Mejor suposición: el Anexo B no fija una ruta /pages/[slug] propia
      // para páginas sueltas — a confirmar cuando se construya esa ruta
      // en la Fase 4 (arquitectura §14.3).
      return `/${slug}`
  }
}

function kindFor(contentType: PinDirectoryEntry['contentType']): string {
  if (contentType === 'episode') return 'channel'
  if (contentType === 'page') return 'other'
  return contentType
}

function enrich(
  pinIds: string[],
  directory: Record<string, PinDirectoryEntry>,
): FeedBatchItem[] {
  return pinIds.map((pinId) => {
    const meta = directory[pinId]
    if (!meta) {
      throw new Error(
        `Pin ${pinId} de la ronda no tiene entrada en el directorio — dataset inconsistente.`,
      )
    }
    return {
      pinId,
      contentId: meta.contentId,
      kind: kindFor(meta.contentType),
      destination: destinationFor(meta.contentType, meta.contentSlug),
      ratio: meta.ratio,
      label: meta.label,
      cta: meta.cta,
      alt: meta.alt,
      cloudinaryPublicId: meta.cloudinaryPublicId,
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

  let pinIds = await deps.getRound(sessionId, roundIndex)
  let directory: Record<string, PinDirectoryEntry>

  if (pinIds) {
    // Ronda ya calculada: solo hace falta enriquecer, no releer el catálogo entero.
    directory = await deps.getDirectoryByIds(pinIds)
  } else {
    // Ronda nueva: hace falta el universo completo para poder generarla.
    const [{ snapshot, pinDirectory }, { config }] = await Promise.all([
      deps.getDataset(),
      deps.getConfig(),
    ])
    const { sequence } = generateRound(
      snapshot,
      config,
      session.seed,
      roundIndex,
    )
    pinIds = sequence.map((pin) => pin.pinId)
    await deps.saveRound(sessionId, roundIndex, pinIds)
    directory = pinDirectory
  }

  const items = enrich(pinIds, directory)
  return {
    items,
    cursor: encodeCursor({ sessionId, roundIndex: roundIndex + 1 }),
    hasMore: true,
  }
}

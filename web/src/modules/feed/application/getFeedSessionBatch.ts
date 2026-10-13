import { generateRound } from '@/modules/feed/domain/generateRound'
import {
  FeedSessionNotFoundError,
  InvalidFeedCursorError,
} from '@/modules/feed/domain/feedErrors'
import { toFeedBatchItem } from '@/modules/feed/domain/feedItemPresentation'
import type {
  FeedCatalog,
  FeedCursorCodec,
  FeedSessionRepository,
} from '@/modules/feed/domain/feedPorts'
import type {
  FeedBatchItem,
  FeedBatchResult,
  PinDirectoryEntry,
} from '@/modules/feed/domain/feedReadModels'

/**
 * Una ronda guardada es inmutable, pero el contenido no: si desde que se
 * generó se despublicó o borró un pin (o se quedó sin medio), ya no está en
 * el directorio público: esa unidad simplemente no se sirve, en vez de
 * tumbar el lote entero con un 500.
 */
function enrich(
  unitIds: string[],
  directory: Record<string, PinDirectoryEntry>,
): FeedBatchItem[] {
  const missing = unitIds.filter((unitId) => !directory[unitId])

  if (missing.length > 0) {
    console.warn(
      `Feed: ${missing.length} unidad(es) de la ronda ya no están publicadas y se omiten.`,
    )
  }

  return unitIds.flatMap((unitId) => {
    const meta = directory[unitId]

    return meta ? [toFeedBatchItem(unitId, meta)] : []
  })
}

/**
 * Caso de uso: "dame el siguiente lote de esta sesión de feed" (§16.1,
 * §8.5). Una ronda ya generada se lee tal cual de feed_round (inmutable:
 * los pines ya servidos no cambian aunque cambie el contenido publicado
 * después); una ronda nueva se calcula con generateRound() y se persiste
 * antes de devolverla.
 *
 * Cada ronda es un lote completo (arquitectura §8.2: el tamaño de la tanda
 * lo fijan los casos) — por eso el cursor solo necesita roundIndex, sin
 * offset dentro de la ronda.
 *
 * @throws FeedSessionNotFoundError si la sesión no existe o caducó
 * @throws InvalidFeedCursorError si el cursor no es de esta sesión
 */
export function makeGetFeedSessionBatch({
  sessions,
  catalog,
  cursors,
}: {
  sessions: FeedSessionRepository
  catalog: FeedCatalog
  cursors: FeedCursorCodec
}) {
  return async function getFeedSessionBatch(
    sessionId: string,
    cursor: string | null,
  ): Promise<FeedBatchResult> {
    const session = await sessions.get(sessionId)
    if (!session) throw new FeedSessionNotFoundError()

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      throw new FeedSessionNotFoundError()
    }

    let roundIndex = 0
    if (cursor) {
      const payload = cursors.decode(cursor)
      if (!payload || payload.sessionId !== sessionId) {
        throw new InvalidFeedCursorError()
      }
      roundIndex = payload.roundIndex
    }

    let unitIds = await sessions.getRound(sessionId, roundIndex)
    let directory: Record<string, PinDirectoryEntry>

    if (unitIds) {
      // Ronda ya calculada: solo hace falta enriquecer, no releer el
      // catálogo entero.
      directory = await catalog.directoryByIds(unitIds)
    } else {
      // Ronda nueva: hace falta el universo completo para poder generarla,
      // filtrado por el scope con el que se abrió la sesión (§6.1, §8.2).
      const [{ snapshot, pinDirectory }, config] = await Promise.all([
        catalog.dataset(session.scope, session.excludeContentId),
        catalog.config(),
      ])
      const { sequence } = generateRound(
        snapshot,
        config,
        session.seed,
        roundIndex,
      )
      unitIds = sequence.map((pin) => pin.pinId)
      await sessions.saveRound(sessionId, roundIndex, unitIds)
      directory = pinDirectory
    }

    return {
      items: enrich(unitIds, directory),
      cursor: cursors.encode({ sessionId, roundIndex: roundIndex + 1 }),
      round: roundIndex,
      hasMore: true,
    }
  }
}

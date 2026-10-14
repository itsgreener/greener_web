import { generateRound } from '@/modules/feed/domain/generateRound'
import { resolveBatchSize } from '@/modules/feed/domain/batchSize'
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
 * Cuántos tramos consecutivos sin ningún pin publicado se saltan antes de
 * rendirse y devolver un lote vacío (con cursor al siguiente tramo). Solo
 * ocurre si una ronda guardada quedó casi entera despublicada.
 */
const MAX_SKIPPED_SLICES = 5

/**
 * Caso de uso: "dame el siguiente lote de esta sesión de feed" (§16.1,
 * §8.5). Una ronda ya generada se lee tal cual de feed_round (inmutable:
 * los pines ya servidos no cambian aunque cambie el contenido publicado
 * después); una ronda nueva se calcula con generateRound() y se persiste
 * antes de devolverla.
 *
 * La ronda es la vuelta COMPLETA del feed (todos los casos con su fuerza más
 * el resto de tipos) y puede tener cientos de pines; se precalcula entera
 * pero se sirve por tramos de `batch_size` (40; 20 en móvil, `?size=`), así
 * que la respuesta, la consulta del directorio y el DOM del cliente son de
 * tamaño acotado. El cursor lleva roundIndex + offset dentro de la ronda; al
 * acabar una ronda el siguiente tramo es el principio de la ronda siguiente.
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
    requestedSize?: number | null,
  ): Promise<FeedBatchResult> {
    const session = await sessions.get(sessionId)
    if (!session) throw new FeedSessionNotFoundError()

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      throw new FeedSessionNotFoundError()
    }

    let roundIndex = 0
    let offset = 0
    if (cursor) {
      const payload = cursors.decode(cursor)
      if (!payload || payload.sessionId !== sessionId) {
        throw new InvalidFeedCursorError()
      }
      roundIndex = payload.roundIndex
      offset = payload.offset
    }

    const config = await catalog.config()
    const size = resolveBatchSize(requestedSize, config.batchSize)

    // Ronda en curso, cargada una sola vez; si el cursor apunta a la
    // siguiente se recarga/genera.
    let loadedIndex = -1
    let unitIds: string[] = []
    let generatedDirectory: Record<string, PinDirectoryEntry> | null = null

    async function loadRound(index: number): Promise<void> {
      if (loadedIndex === index) return
      loadedIndex = index
      generatedDirectory = null

      const stored = await sessions.getRound(sessionId, index)
      if (stored) {
        unitIds = stored
        return
      }

      // Ronda nueva: hace falta el universo completo para poder generarla,
      // filtrado por el scope con el que se abrió la sesión (§6.1, §8.2).
      const { snapshot, pinDirectory } = await catalog.dataset(
        session!.scope,
        session!.excludeContentId,
      )
      const { sequence } = generateRound(snapshot, config, session!.seed, index)
      unitIds = sequence.map((pin) => pin.pinId)
      await sessions.saveRound(sessionId, index, unitIds)
      generatedDirectory = pinDirectory
    }

    let items: FeedBatchItem[] = []
    let batch = 0
    let servedRound = roundIndex

    for (let skipped = 0; skipped <= MAX_SKIPPED_SLICES; skipped++) {
      await loadRound(roundIndex)

      // Offset más allá del final (ronda cambiada de tamaño, cursor viejo):
      // principio de la ronda siguiente.
      if (offset >= unitIds.length && unitIds.length > 0) {
        roundIndex += 1
        offset = 0
        continue
      }

      const slice = unitIds.slice(offset, offset + size)
      servedRound = roundIndex
      batch = Math.floor(offset / size)

      const directory =
        generatedDirectory ?? (await catalog.directoryByIds(slice))
      items = enrich(slice, directory)

      const end = offset + size
      if (end >= unitIds.length) {
        roundIndex += 1
        offset = 0
      } else {
        offset = end
      }

      // Ronda realmente vacía (universo sin pines): lote vacío, el cliente
      // lo trata como fin. Tramo sin pines publicados: se salta al siguiente.
      if (items.length > 0 || slice.length === 0) break
    }

    return {
      items,
      cursor: cursors.encode({ sessionId, roundIndex, offset }),
      round: servedRound,
      batch,
      hasMore: true,
    }
  }
}

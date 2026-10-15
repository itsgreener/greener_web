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
import {
  interludesInRange,
  newsletterItemId,
  pagePinIndex,
  type InterludeSlot,
} from '@/modules/feed/domain/interludes'
import type {
  FeedBatchItem,
  FeedBatchResult,
  FeedInterlude,
  PinDirectoryEntry,
} from '@/modules/feed/domain/feedReadModels'

/**
 * Una ronda guardada es inmutable, pero el contenido no: si desde que se
 * generó se despublicó o borró un pin (o se quedó sin medio), ya no está en
 * el directorio público: esa unidad simplemente no se sirve, en vez de
 * tumbar el lote entero con un 500.
 *
 * Tras el pin de ronda número `position` (cuenta global de la sesión, desde
 * 1) se intercala el interludio que el calendario haya fijado ahí, si lo
 * hay. El interludio va tras SU pin aunque ese pin ya no esté publicado.
 */
function enrich(
  unitIds: string[],
  directory: Record<string, PinDirectoryEntry>,
  firstPosition: number,
  interludeAfter: (position: number) => FeedBatchItem | null,
): FeedBatchItem[] {
  const missing = unitIds.filter((unitId) => !directory[unitId])

  if (missing.length > 0) {
    console.warn(
      `Feed: ${missing.length} unidad(es) de la ronda ya no están publicadas y se omiten.`,
    )
  }

  return unitIds.flatMap((unitId, index) => {
    const meta = directory[unitId]
    const items: FeedBatchItem[] = meta ? [toFeedBatchItem(unitId, meta)] : []
    const interlude = interludeAfter(firstPosition + index)

    if (interlude) items.push(interlude)

    return items
  })
}

/**
 * El interludio de una aparición, o null si no se sirve: newsletter ya
 * suscrita en este dispositivo (se omite sin sustituirla por otro `other`) o
 * una página sin ningún pin servible.
 */
function interludeItem(
  slot: InterludeSlot,
  entry: FeedInterlude,
  seed: string,
  newsletterSubscribed: boolean,
): FeedBatchItem | null {
  if (entry.kind === 'newsletter') {
    if (newsletterSubscribed) return null

    return {
      kind: 'newsletter',
      pinId: newsletterItemId(entry.contentId, slot.occurrence),
      contentId: entry.contentId,
      title: entry.title,
      text: entry.text,
    }
  }

  if (entry.pins.length === 0) return null

  const pin =
    entry.pins[
      pagePinIndex(seed, entry.contentId, slot.occurrence, entry.pins.length)
    ]!

  return toFeedBatchItem(pin.pinId, pin.entry)
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
 * Interludios (plan de `other`, fase 2): solo en la home y sin contenido
 * excluido (las recomendaciones de una ficha son sesiones `home` con
 * exclusión), los contenidos `other` publicados se intercalan según el
 * calendario de `domain/interludes.ts`, que se recalcula en cada petición a
 * partir de la seed de la sesión y del contador `served` del cursor (pines de
 * ronda servidos, sin contar interludios). No se guardan en la ronda.
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
    options: {
      /**
       * Este visitante ya se suscribió a la newsletter (cookie propia leída
       * por la ruta): sus apariciones se omiten.
       */
      newsletterSubscribed?: boolean
    } = {},
  ): Promise<FeedBatchResult> {
    const session = await sessions.get(sessionId)
    if (!session) throw new FeedSessionNotFoundError()

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      throw new FeedSessionNotFoundError()
    }

    let roundIndex = 0
    let offset = 0
    let served = 0
    if (cursor) {
      const payload = cursors.decode(cursor)
      if (!payload || payload.sessionId !== sessionId) {
        throw new InvalidFeedCursorError()
      }
      roundIndex = payload.roundIndex
      offset = payload.offset
      served = payload.served
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

    // Interludios: se leen una sola vez por petición y solo si aplican.
    const interludesApply =
      session.scope === 'home' && !session.excludeContentId
    let interludeEntries: FeedInterlude[] | null = null

    async function loadInterludes(): Promise<FeedInterlude[]> {
      if (!interludesApply) return []
      if (interludeEntries) return interludeEntries

      try {
        interludeEntries = await catalog.interludes()
      } catch (error) {
        // Un fallo leyendo los `other` no debe tumbar el feed: se sirve la
        // ronda sin interludios.
        console.error('Feed: no se pudieron leer los interludios:', error)
        interludeEntries = []
      }

      return interludeEntries
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
      const entries = await loadInterludes()
      const slotByPosition = new Map(
        interludesInRange(
          session.seed,
          entries,
          served,
          served + slice.length,
        ).map((slot) => [slot.position, slot]),
      )
      const entryById = new Map(
        entries.map((entry) => [entry.contentId, entry]),
      )

      items = enrich(slice, directory, served + 1, (position) => {
        const slot = slotByPosition.get(position)
        const entry = slot ? entryById.get(slot.contentId) : undefined

        return slot && entry
          ? interludeItem(
              slot,
              entry,
              session.seed,
              options.newsletterSubscribed ?? false,
            )
          : null
      })
      served += slice.length

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
      cursor: cursors.encode({ sessionId, roundIndex, offset, served }),
      round: servedRound,
      batch,
      hasMore: true,
    }
  }
}

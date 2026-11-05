import type {
  MediaCleanup,
  PurgeResult,
} from '@/modules/media/domain/mediaCleanupPorts'

import {
  deletePinSchema,
  type DeletePinInput,
} from '@/modules/pin/domain/pinSchema'
import type { PinRepository } from '@/modules/pin/domain/pinRepository'

/**
 * Borra un pin. Los medios del pin se leen ANTES de borrarlo (después ya no
 * hay forma de saber qué archivos eran suyos); Postgres borra los
 * `media_asset` que se quedan sin referencias (`delete_pin`) y aquí se borra
 * el archivo real. Best-effort: si el almacén falla, el pin ya no existe y
 * solo se cuenta en `failed`.
 */
export function makeDeletePin({
  pins,
  cleanup,
}: {
  pins: PinRepository
  cleanup: MediaCleanup
}) {
  return async function deletePin(input: DeletePinInput): Promise<PurgeResult> {
    const validated = deletePinSchema.parse(input)

    const refs = await cleanup.snapshotPinMedia(validated.id)

    await pins.delete(validated)

    return cleanup.purgeRemovedMedia(refs)
  }
}

export interface DeleteAllPinsResult {
  /** Pines que tenía el contenido. */
  total: number
  deleted: number
  /** El borrado se detuvo por un error antes de terminar. */
  stopped: boolean
  purge: PurgeResult
}

/**
 * Borra TODOS los pines de un contenido (máximo 8). Reutiliza `delete_pin`
 * pin a pin, que ya limpia en Postgres los `media_asset` que se quedan sin
 * referencias; los archivos se borran al final con la lista leída antes de
 * cada borrado.
 *
 * No es atómico entre pines: si uno falla, se detiene y se informa de
 * cuántos se llegaron a borrar (los ya borrados no se restauran, y sus
 * archivos se limpian igualmente).
 */
export function makeDeleteAllPins({
  pins,
  cleanup,
}: {
  pins: PinRepository
  cleanup: MediaCleanup
}) {
  return async function deleteAllPins(
    contentId: string,
  ): Promise<DeleteAllPinsResult> {
    const list = await pins.listByContentId(contentId)

    const refs: Awaited<ReturnType<MediaCleanup['snapshotPinMedia']>> = []

    let deleted = 0
    let stopped = false

    for (const pin of list) {
      const pinRefs = await cleanup.snapshotPinMedia(pin.id)

      try {
        await pins.delete(deletePinSchema.parse({ id: pin.id }))
      } catch (error) {
        console.error(error)
        stopped = true
        break
      }

      deleted += 1
      refs.push(...pinRefs)
    }

    // Aunque haya fallado a mitad, los pines ya borrados dejan sus archivos
    // sin dueño: se purgan igual.
    const purge = await cleanup.purgeRemovedMedia(refs)

    return { total: list.length, deleted, stopped, purge }
  }
}

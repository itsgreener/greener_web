import type {
  MediaCleanup,
  PurgeResult,
} from '@/modules/media/domain/mediaCleanupPorts'

import {
  deleteContentSchema,
  type DeleteContentInput,
} from '@/modules/content/domain/contentSchema'
import type { ContentRepository } from '@/modules/content/domain/contentRepository'

/**
 * Borra un contenido (solo borradores) y sus archivos. Los medios se leen
 * ANTES de borrar —portada, og, pines, carrusel— porque después ya no hay
 * de dónde sacarlos; `delete_content` borra en Postgres los `media_asset`
 * que se quedan sin referencias y aquí se borran los archivos reales.
 *
 * Si falla la base de datos, lanza y no se toca el almacén. Si falla el
 * almacén, `failed` lo cuenta y el reconciliador recoge lo suelto.
 */
export function makeDeleteContent({
  contents,
  cleanup,
}: {
  contents: ContentRepository
  cleanup: MediaCleanup
}) {
  return async function deleteContent(
    input: DeleteContentInput,
  ): Promise<PurgeResult> {
    const validated = deleteContentSchema.parse(input)

    const refs = await cleanup.snapshotContentMedia(validated.id)

    await contents.delete(validated)

    return cleanup.purgeRemovedMedia(refs)
  }
}

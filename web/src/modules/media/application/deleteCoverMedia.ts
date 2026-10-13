import {
  deleteCoverMediaSchema,
  type DeleteCoverMediaInput,
} from '@/modules/media/domain/mediaAssetSchema'
import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import type {
  MediaCleanup,
  PurgeResult,
} from '@/modules/media/domain/mediaCleanupPorts'

/**
 * Desvincula y borra la portada actual de un contenido ANTES de subir la
 * que la sustituye: primero la base de datos (atómico, y si el medio sigue en
 * uso en otro sitio, aborta sin tocar nada más) y solo si eso tiene éxito se
 * borra el archivo real.
 *
 * El archivo a borrar se lee de la base de datos ANTES de desvincular, nunca
 * del navegador (auditoría 8 oct, P0-2). Si falla la base de datos, lanza y
 * no se toca el almacén; si falla el almacén, el resultado lo cuenta en
 * `failed` y el reconciliador recoge el archivo suelto.
 */
export function makeDeleteCoverMedia({
  media,
  cleanup,
}: {
  media: MediaAssetRepository
  cleanup: MediaCleanup
}) {
  return async function deleteCoverMedia(
    input: DeleteCoverMediaInput,
  ): Promise<PurgeResult> {
    const validated = deleteCoverMediaSchema.parse(input)

    const refs = await cleanup.snapshotMedia([validated.mediaId])

    await media.unlinkAndDeleteCoverMedia(validated)

    return cleanup.purgeRemovedMedia(refs)
  }
}

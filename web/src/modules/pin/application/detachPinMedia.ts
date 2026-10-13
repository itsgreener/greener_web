import type {
  MediaCleanup,
  PurgeResult,
} from '@/modules/media/domain/mediaCleanupPorts'

import {
  detachPinMediaSchema,
  type DetachPinMediaInput,
} from '@/modules/pin/domain/pinMediaSchema'
import type { PinMediaRepository } from '@/modules/pin/domain/pinMediaRepository'

/**
 * Desvincula un medio de un pin. El archivo a borrar se lee de la base de
 * datos ANTES de desvincular, nunca del navegador: `cloudinaryPublicId` y
 * `kind` del input se ignoran para borrar (auditoría 8 oct, P0-2).
 */
export function makeDetachPinMedia({
  pinMedia,
  cleanup,
}: {
  pinMedia: PinMediaRepository
  cleanup: MediaCleanup
}) {
  return async function detachPinMedia(
    input: DetachPinMediaInput,
  ): Promise<PurgeResult> {
    const validated = detachPinMediaSchema.parse(input)

    const refs = await cleanup.snapshotMedia([validated.mediaId])

    await pinMedia.detach(validated)

    // detach_pin_media ya borró el media_asset; purgeRemovedMedia solo borra
    // en el almacén lo que ya no existe en la base de datos y está en la
    // carpeta del ABM.
    return cleanup.purgeRemovedMedia(refs)
  }
}

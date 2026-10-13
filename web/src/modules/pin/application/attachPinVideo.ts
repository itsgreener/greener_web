import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'

import {
  attachPinVideoSchema,
  type AttachPinVideoInput,
} from '@/modules/pin/domain/pinMediaSchema'
import type { PinMediaRepository } from '@/modules/pin/domain/pinMediaRepository'

/**
 * Adjunta a un pin el vídeo que el navegador ya subió. La duración sale del
 * almacén; solo si faltara se usa la que dio el navegador, nunca una
 * inventada. Después encarga el calentamiento del contenido.
 *
 * @throws VideoVerificationError si el archivo no es válido
 */
export function makeAttachPinVideo({
  pinMedia,
  verifier,
  warm,
}: {
  pinMedia: PinMediaRepository
  verifier: MediaVerifier
  warm: WarmScheduler
}) {
  return async function attachPinVideo(input: AttachPinVideoInput) {
    const verified = await verifier.verifyVideo(
      input.cloudinaryPublicId,
      input.durationSeconds,
    )

    const mediaId = await pinMedia.attachVideo(
      attachPinVideoSchema.parse({ ...input, ...verified }),
    )

    await warm.forPin(input.pinId)

    return mediaId
  }
}

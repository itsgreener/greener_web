import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'

import {
  attachPinImageSchema,
  type AttachPinImageInput,
} from '@/modules/pin/domain/pinMediaSchema'
import type { PinMediaRepository } from '@/modules/pin/domain/pinMediaRepository'

/**
 * Adjunta a un pin la imagen que el navegador ya subió. Los metadatos
 * (formato, medidas, peso) se consultan en el almacén: los del navegador no
 * se usan.
 *
 * @throws ImageVerificationError si el archivo no es válido
 */
export function makeAttachPinImage({
  pinMedia,
  verifier,
}: {
  pinMedia: PinMediaRepository
  verifier: MediaVerifier
}) {
  return async function attachPinImage(input: AttachPinImageInput) {
    const verified = await verifier.verifyImage(input.cloudinaryPublicId)

    return pinMedia.attachImage(
      attachPinImageSchema.parse({ ...input, ...verified }),
    )
  }
}

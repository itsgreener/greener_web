import {
  registerCoverImageSchema,
  type RegisterCoverImageInput,
} from '@/modules/media/domain/mediaAssetSchema'
import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'

/**
 * Registra la imagen de portada ya subida por el navegador. Los metadatos
 * (formato, medidas, peso) se consultan en el almacén: los del navegador no
 * se usan.
 *
 * @throws ImageVerificationError si el archivo no es válido
 */
export function makeRegisterCoverImage({
  media,
  verifier,
}: {
  media: MediaAssetRepository
  verifier: MediaVerifier
}) {
  return async function registerCoverImage(input: RegisterCoverImageInput) {
    const verified = await verifier.verifyImage(input.cloudinaryPublicId)

    return media.registerCoverImage(
      registerCoverImageSchema.parse({ ...input, ...verified }),
    )
  }
}

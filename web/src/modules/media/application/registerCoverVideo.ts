import {
  registerCoverVideoSchema,
  type RegisterCoverVideoInput,
} from '@/modules/media/domain/mediaAssetSchema'
import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'

/**
 * Registra el vídeo de portada ya subido por el navegador. La duración sale
 * del almacén; solo si faltara se usa la que dio el navegador, nunca una
 * inventada. Después encarga el calentamiento del vídeo.
 *
 * @throws VideoVerificationError si el archivo no es válido
 */
export function makeRegisterCoverVideo({
  media,
  verifier,
  warm,
}: {
  media: MediaAssetRepository
  verifier: MediaVerifier
  warm: WarmScheduler
}) {
  return async function registerCoverVideo(input: RegisterCoverVideoInput) {
    const verified = await verifier.verifyVideo(
      input.cloudinaryPublicId,
      input.durationSeconds,
    )

    const mediaId = await media.registerCoverVideo(
      registerCoverVideoSchema.parse({ ...input, ...verified }),
    )

    await warm.forContent(input.contentId)

    return mediaId
  }
}

import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import {
  addCaseCarouselImageSchema,
  addCaseCarouselVideoSchema,
  type AddCaseCarouselImageInput,
  type AddCaseCarouselVideoInput,
} from '@/modules/media/domain/mediaAssetSchema'
import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'

/**
 * Añade una imagen al carrusel de un caso. Los metadatos salen del archivo
 * real, no de lo que dijo el navegador.
 *
 * @throws ImageVerificationError si el archivo no es válido
 */
export function makeAddCaseCarouselImage({
  media,
  verifier,
}: {
  media: MediaAssetRepository
  verifier: MediaVerifier
}) {
  return async function addCaseCarouselImage(input: AddCaseCarouselImageInput) {
    const verified = await verifier.verifyImage(input.cloudinaryPublicId)

    return media.addCaseCarouselImage(
      addCaseCarouselImageSchema.parse({ ...input, ...verified }),
    )
  }
}

/**
 * Añade un vídeo al carrusel de un caso y encarga su calentamiento.
 *
 * @throws VideoVerificationError si el archivo no es válido
 */
export function makeAddCaseCarouselVideo({
  media,
  verifier,
  warm,
}: {
  media: MediaAssetRepository
  verifier: MediaVerifier
  warm: WarmScheduler
}) {
  return async function addCaseCarouselVideo(input: AddCaseCarouselVideoInput) {
    const verified = await verifier.verifyVideo(
      input.cloudinaryPublicId,
      input.durationSeconds,
    )

    const mediaId = await media.addCaseCarouselVideo(
      addCaseCarouselVideoSchema.parse({ ...input, ...verified }),
    )

    await warm.forContent(input.contentId)

    return mediaId
  }
}

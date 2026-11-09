import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import {
  updateCaseCarouselAltSchema,
  type UpdateCaseCarouselAltInput,
} from '@/modules/media/domain/mediaAssetSchema'

/**
 * Cambia solo el texto alternativo de una diapositiva: no toca el medio, así
 * que no pasa por Cloudinary.
 */
export function makeUpdateCaseCarouselAlt({
  media,
}: {
  media: MediaAssetRepository
}) {
  return async function updateCaseCarouselAlt(
    input: UpdateCaseCarouselAltInput,
  ): Promise<string> {
    return media.updateCaseCarouselAlt(updateCaseCarouselAltSchema.parse(input))
  }
}

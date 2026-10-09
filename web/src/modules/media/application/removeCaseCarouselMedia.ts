import {
  removeCaseCarouselMediaSchema,
  type RemoveCaseCarouselMediaInput,
} from '../domain/mediaAssetSchema'

import { supabaseMediaAssetRepository } from '../infrastructure/supabaseMediaAssetRepository'

export async function removeCaseCarouselMedia(
  input: RemoveCaseCarouselMediaInput,
) {
  const validated = removeCaseCarouselMediaSchema.parse(input)

  return supabaseMediaAssetRepository.removeCaseCarouselMedia(validated)
}

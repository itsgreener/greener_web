import {
  addCaseCarouselImageSchema,
  type AddCaseCarouselImageInput,
} from '../domain/mediaAssetSchema'

import { supabaseMediaAssetRepository } from '../infrastructure/supabaseMediaAssetRepository'

export async function addCaseCarouselImage(input: AddCaseCarouselImageInput) {
  const validated = addCaseCarouselImageSchema.parse(input)

  return supabaseMediaAssetRepository.addCaseCarouselImage(validated)
}

import {
  addCaseCarouselVideoSchema,
  type AddCaseCarouselVideoInput,
} from '../domain/mediaAssetSchema'

import { supabaseMediaAssetRepository } from '../infrastructure/supabaseMediaAssetRepository'

export async function addCaseCarouselVideo(input: AddCaseCarouselVideoInput) {
  const validated = addCaseCarouselVideoSchema.parse(input)

  return supabaseMediaAssetRepository.addCaseCarouselVideo(validated)
}

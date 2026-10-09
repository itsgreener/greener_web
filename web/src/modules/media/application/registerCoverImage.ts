import {
  registerCoverImageSchema,
  type RegisterCoverImageInput,
} from '../domain/mediaAssetSchema'

import { supabaseMediaAssetRepository } from '../infrastructure/supabaseMediaAssetRepository'

export async function registerCoverImage(input: RegisterCoverImageInput) {
  const validated = registerCoverImageSchema.parse(input)

  return supabaseMediaAssetRepository.registerCoverImage(validated)
}

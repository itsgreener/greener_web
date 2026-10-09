import {
  registerCoverVideoSchema,
  type RegisterCoverVideoInput,
} from '../domain/mediaAssetSchema'

import { supabaseMediaAssetRepository } from '../infrastructure/supabaseMediaAssetRepository'

export async function registerCoverVideo(input: RegisterCoverVideoInput) {
  const validated = registerCoverVideoSchema.parse(input)

  return supabaseMediaAssetRepository.registerCoverVideo(validated)
}

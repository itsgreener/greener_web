import {
  registerVideoForBlockSchema,
  type RegisterVideoForBlockInput,
} from '../domain/mediaAssetSchema'

import { supabaseMediaAssetRepository } from '../infrastructure/supabaseMediaAssetRepository'

export async function registerVideoForBlock(input: RegisterVideoForBlockInput) {
  const validated = registerVideoForBlockSchema.parse(input)

  return supabaseMediaAssetRepository.registerVideoForBlock(validated)
}

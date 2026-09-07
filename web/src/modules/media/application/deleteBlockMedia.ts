import {
  deleteBlockMediaSchema,
  type DeleteBlockMediaInput,
} from '../domain/mediaAssetSchema'

import { supabaseMediaAssetRepository } from '../infrastructure/supabaseMediaAssetRepository'

export async function deleteBlockMedia(input: DeleteBlockMediaInput) {
  const validated = deleteBlockMediaSchema.parse(input)

  return supabaseMediaAssetRepository.unlinkAndDelete(validated)
}

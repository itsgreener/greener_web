import {
  deleteCoverMediaSchema,
  type DeleteCoverMediaInput,
} from '../domain/mediaAssetSchema'

import { supabaseMediaAssetRepository } from '../infrastructure/supabaseMediaAssetRepository'

export async function deleteCoverMedia(input: DeleteCoverMediaInput) {
  const validated = deleteCoverMediaSchema.parse(input)

  return supabaseMediaAssetRepository.unlinkAndDeleteCoverMedia(validated)
}

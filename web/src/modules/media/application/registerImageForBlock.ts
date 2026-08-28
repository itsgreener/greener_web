import {
  registerImageForBlockSchema,
  type RegisterImageForBlockInput,
} from '../domain/mediaAssetSchema'

import {
  supabaseMediaAssetRepository,
} from '../infrastructure/supabaseMediaAssetRepository'

export async function registerImageForBlock(
  input:
    RegisterImageForBlockInput
) {
  const validated =
    registerImageForBlockSchema
      .parse(input)

  return supabaseMediaAssetRepository
    .registerImageForBlock(
      validated
    )
}
import {
  contentBlockTranslationSchema,
  type UpsertContentBlockTranslationInput,
} from '../domain/contentBlockSchema'

import {
  supabaseContentBlockRepository,
} from '../infrastructure/supabaseContentBlockRepository'

export async function upsertContentBlockTranslation(
  input:
    UpsertContentBlockTranslationInput
) {
  const validated =
    contentBlockTranslationSchema
      .parse(input)

  return supabaseContentBlockRepository
    .upsertTranslation(
      validated
    )
}
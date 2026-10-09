import {
  contentTranslationSchema,
  type UpsertContentTranslationInput,
} from '../domain/contentTranslationSchema'

import { supabaseContentTranslationRepository } from '../infrastructure/supabaseContentTranslationRepository'

export async function upsertContentTranslation(
  input: UpsertContentTranslationInput,
) {
  const validated = contentTranslationSchema.parse(input)

  return supabaseContentTranslationRepository.upsert(validated)
}

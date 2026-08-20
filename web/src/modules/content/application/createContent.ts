import {
  createContentSchema,
  type CreateContentInput,
} from '../domain/contentSchema'

import {
  supabaseContentRepository,
} from '../infrastructure/supabaseContentRepository'

export async function createContent(
  input: CreateContentInput
) {
  const validated =
    createContentSchema.parse(input)

  return supabaseContentRepository
    .createDraft(validated)
}
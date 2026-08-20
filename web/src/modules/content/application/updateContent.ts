import {
  updateContentSchema,
  type UpdateContentInput,
} from '../domain/contentSchema'

import {
  supabaseContentRepository,
} from '../infrastructure/supabaseContentRepository'

export async function updateContent(
  input: UpdateContentInput
) {
  const validated =
    updateContentSchema.parse(input)

  return supabaseContentRepository
    .update(validated)
}
import {
  deleteContentSchema,
  type DeleteContentInput,
} from '../domain/contentSchema'

import {
  supabaseContentRepository,
} from '../infrastructure/supabaseContentRepository'

export async function deleteContent(
  input: DeleteContentInput
) {
  const validated =
    deleteContentSchema.parse(input)

  return supabaseContentRepository
    .delete(validated)
}
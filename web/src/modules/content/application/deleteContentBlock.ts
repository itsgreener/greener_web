import {
  deleteContentBlockSchema,
  type DeleteContentBlockInput,
} from '../domain/contentBlockSchema'

import { supabaseContentBlockRepository } from '../infrastructure/supabaseContentBlockRepository'

export async function deleteContentBlock(input: DeleteContentBlockInput) {
  const validated = deleteContentBlockSchema.parse(input)

  return supabaseContentBlockRepository.delete(validated)
}

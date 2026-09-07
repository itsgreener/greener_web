import {
  updateContentBlockSchema,
  type UpdateContentBlockInput,
} from '../domain/contentBlockSchema'

import { supabaseContentBlockRepository } from '../infrastructure/supabaseContentBlockRepository'

export async function updateContentBlock(input: UpdateContentBlockInput) {
  const validated = updateContentBlockSchema.parse(input)

  return supabaseContentBlockRepository.update(validated)
}

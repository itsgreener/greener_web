import {
  createContentBlockSchema,
  type CreateContentBlockInput,
} from '../domain/contentBlockSchema'

import { supabaseContentBlockRepository } from '../infrastructure/supabaseContentBlockRepository'

export async function createContentBlock(input: CreateContentBlockInput) {
  const validated = createContentBlockSchema.parse(input)

  return supabaseContentBlockRepository.create(validated)
}

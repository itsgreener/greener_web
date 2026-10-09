import {
  unpublishContentSchema,
  type UnpublishContentInput,
} from '../domain/contentSchema'

import { supabaseContentRepository } from '../infrastructure/supabaseContentRepository'

export async function unpublishContent(input: UnpublishContentInput) {
  const validated = unpublishContentSchema.parse(input)

  return supabaseContentRepository.unpublish(validated)
}

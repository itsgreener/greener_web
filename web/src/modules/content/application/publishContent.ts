import {
  publishContentSchema,
  type PublishContentInput,
} from '../domain/contentSchema'

import { supabaseContentRepository } from '../infrastructure/supabaseContentRepository'

export async function publishContent(input: PublishContentInput) {
  const validated = publishContentSchema.parse(input)

  return supabaseContentRepository.publish(validated)
}

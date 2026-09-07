import {
  scheduleContentSchema,
  type ScheduleContentInput,
} from '../domain/contentSchema'

import { supabaseContentRepository } from '../infrastructure/supabaseContentRepository'

export async function scheduleContent(input: ScheduleContentInput) {
  const validated = scheduleContentSchema.parse(input)

  return supabaseContentRepository.schedule(validated)
}

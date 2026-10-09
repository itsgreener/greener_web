import { episodeSchema, type UpsertEpisodeInput } from '../domain/episodeSchema'

import { supabaseEpisodeRepository } from '../infrastructure/supabaseEpisodeRepository'

export async function upsertEpisode(input: UpsertEpisodeInput) {
  const validated = episodeSchema.parse(input)

  return supabaseEpisodeRepository.upsert(validated)
}

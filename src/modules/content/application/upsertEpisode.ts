import {
  episodeSchema,
  type UpsertEpisodeInput,
} from '@/modules/content/domain/episodeSchema'
import type { EpisodeRepository } from '@/modules/content/domain/episodeRepository'

export function makeUpsertEpisode({
  episodes,
}: {
  episodes: EpisodeRepository
}) {
  return async function upsertEpisode(input: UpsertEpisodeInput) {
    const validated = episodeSchema.parse(input)

    return episodes.upsert(validated)
  }
}

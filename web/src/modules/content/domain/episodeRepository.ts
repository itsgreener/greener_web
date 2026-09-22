import type { Episode, UpsertEpisodeInput } from './episodeSchema'

export interface EpisodeRepository {
  getByContentId(contentId: string): Promise<Episode | null>

  upsert(input: UpsertEpisodeInput): Promise<string>
}

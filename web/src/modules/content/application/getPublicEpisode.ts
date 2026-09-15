import { getPublicEpisode as getPublicEpisodeSource } from '../infrastructure/publicEpisodeSource'

export async function getPublicEpisode(contentId: string) {
  return getPublicEpisodeSource(contentId)
}

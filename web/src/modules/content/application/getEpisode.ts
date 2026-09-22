import { supabaseEpisodeRepository } from '../infrastructure/supabaseEpisodeRepository'

export async function getEpisode(contentId: string) {
  return supabaseEpisodeRepository.getByContentId(contentId)
}

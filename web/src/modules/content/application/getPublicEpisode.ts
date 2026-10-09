import type { AppSupabaseClient } from '@/lib/supabase/database'
import { getPublicEpisode as getPublicEpisodeSource } from '../infrastructure/publicEpisodeSource'

export async function getPublicEpisode(
  contentId: string,
  client?: AppSupabaseClient,
) {
  return getPublicEpisodeSource(contentId, client)
}

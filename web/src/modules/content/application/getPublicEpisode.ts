import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublicEpisode as getPublicEpisodeSource } from '../infrastructure/publicEpisodeSource'

export async function getPublicEpisode(
  contentId: string,
  client?: SupabaseClient,
) {
  return getPublicEpisodeSource(contentId, client)
}

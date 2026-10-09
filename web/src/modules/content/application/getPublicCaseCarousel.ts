import type { AppSupabaseClient } from '@/lib/supabase/database'
import { getPublicCaseCarousel as getPublicCaseCarouselSource } from '../infrastructure/publicCaseSource'

export async function getPublicCaseCarousel(
  contentId: string,
  client?: AppSupabaseClient,
) {
  return getPublicCaseCarouselSource(contentId, client)
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublicCaseCarousel as getPublicCaseCarouselSource } from '../infrastructure/publicCaseSource'

export async function getPublicCaseCarousel(
  contentId: string,
  client?: SupabaseClient,
) {
  return getPublicCaseCarouselSource(contentId, client)
}

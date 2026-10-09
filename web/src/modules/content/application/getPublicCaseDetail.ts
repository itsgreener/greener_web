import type { AppSupabaseClient } from '@/lib/supabase/database'
import { getPublicCaseDetail as getPublicCaseDetailSource } from '../infrastructure/publicCaseSource'

export async function getPublicCaseDetail(
  contentId: string,
  client?: AppSupabaseClient,
) {
  return getPublicCaseDetailSource(contentId, client)
}

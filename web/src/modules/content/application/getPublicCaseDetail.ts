import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublicCaseDetail as getPublicCaseDetailSource } from '../infrastructure/publicCaseSource'

export async function getPublicCaseDetail(
  contentId: string,
  client?: SupabaseClient,
) {
  return getPublicCaseDetailSource(contentId, client)
}

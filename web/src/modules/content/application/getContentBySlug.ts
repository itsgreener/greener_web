import type { AppSupabaseClient } from '@/lib/supabase/database'
import { getContentBySlug as getContentBySlugSource } from '../infrastructure/publicContentSource'

import type { Locale } from '@/modules/shared/domain/locale'
export async function getContentBySlug(
  slug: string,
  locale?: Locale,
  client?: AppSupabaseClient,
) {
  return getContentBySlugSource(slug, locale, client)
}

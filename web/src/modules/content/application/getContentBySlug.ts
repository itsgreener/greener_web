import type { SupabaseClient } from '@supabase/supabase-js'
import type { Locale } from '../domain/contentSchema'
import { getContentBySlug as getContentBySlugSource } from '../infrastructure/publicContentSource'

export async function getContentBySlug(
  slug: string,
  locale?: Locale,
  client?: SupabaseClient,
) {
  return getContentBySlugSource(slug, locale, client)
}

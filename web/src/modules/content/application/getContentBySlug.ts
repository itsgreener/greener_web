import type { Locale } from '../domain/contentSchema'
import { getContentBySlug as getContentBySlugSource } from '../infrastructure/publicContentSource'

export async function getContentBySlug(slug: string, locale?: Locale) {
  return getContentBySlugSource(slug, locale)
}

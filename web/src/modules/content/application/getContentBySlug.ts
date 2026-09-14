import { getContentBySlug as getContentBySlugSource } from '../infrastructure/publicContentSource'

export async function getContentBySlug(slug: string) {
  return getContentBySlugSource(slug)
}

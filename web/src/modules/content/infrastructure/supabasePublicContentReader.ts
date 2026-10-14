import type { AppSupabaseClient } from '@/lib/supabase/database'

import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'

import { getEpisodePoster } from './episodePoster'
import { getFirstPinMedia } from './firstPinMedia'
import { getPublicCaseCarousel, getPublicCaseDetail } from './publicCaseSource'
import { getContentBySlug } from './publicContentSource'
import { getPublicEpisode } from './publicEpisodeSource'
import { getPublicPinCover } from './publicPinCover'
import { getPublishedContentId } from './publishedContentId'
import { listPublishedForSitemap } from './publicSitemapSource'

/**
 * Lector de la web pública sobre Supabase. Sin cliente, lee con el público
 * (RLS: solo lo publicado); con uno, lee con sus privilegios — así lo usa la
 * vista previa, que pasa un cliente de servicio una vez validado el token.
 */
export function createSupabasePublicContentReader(
  client?: AppSupabaseClient,
): PublicContentReader {
  return {
    contentBySlug: (slug, locale) => getContentBySlug(slug, locale, client),
    caseDetail: (contentId) => getPublicCaseDetail(contentId, client),
    caseCarousel: (contentId) => getPublicCaseCarousel(contentId, client),
    episode: (contentId) => getPublicEpisode(contentId, client),
    firstPinMedia: (contentId) => getFirstPinMedia(contentId, client),
    episodePoster: (contentId) => getEpisodePoster(contentId, client),
    pinCover: (contentId, pinId) => getPublicPinCover(contentId, pinId, client),
    publishedContentId: (type, slug) =>
      getPublishedContentId(type, slug, client),
    publishedForSitemap: () => listPublishedForSitemap(client),
  }
}

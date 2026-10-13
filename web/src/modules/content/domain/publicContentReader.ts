import type { ContentType } from '@/modules/shared/domain/contentType'
import type { Locale } from '@/modules/shared/domain/locale'

import type {
  PublicCaseCarouselItem,
  PublicCaseDetail,
  PublicContent,
  PublicContentMedia,
  PublicEpisode,
  PublicPinCover,
} from './publicContent'
import type { SitemapContentRow } from './sitemap'

/**
 * Lecturas de la web pública. Una instancia ya sabe con qué privilegios lee:
 * la normal solo ve lo publicado; la de preview (con un token válido) también
 * los borradores. Las páginas la usan sin saber qué hay detrás.
 */
export interface PublicContentReader {
  contentBySlug(slug: string, locale?: Locale): Promise<PublicContent | null>

  caseDetail(contentId: string): Promise<PublicCaseDetail | null>

  caseCarousel(contentId: string): Promise<PublicCaseCarouselItem[]>

  episode(contentId: string): Promise<PublicEpisode | null>

  /** Primer medio del primer pin: imagen de compartición de tools e insights. */
  firstPinMedia(contentId: string): Promise<PublicContentMedia | null>

  /**
   * Portada de la ficha desde el pin que originó la navegación. El pin se
   * filtra también por contenido: `?pin=` no puede inyectar el medio de otro.
   */
  pinCover(contentId: string, pinId: string): Promise<PublicPinCover | null>

  /**
   * Id de un contenido publicado por tipo y slug; null si no existe.
   *
   * @throws si la lectura falla
   */
  publishedContentId(type: ContentType, slug: string): Promise<string | null>

  /** Todo el contenido publicado, para el sitemap. */
  publishedForSitemap(): Promise<SitemapContentRow[]>
}

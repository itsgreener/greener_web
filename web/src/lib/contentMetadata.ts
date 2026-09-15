import type { Metadata } from 'next'
import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'

/**
 * generateMetadata compartido por las plantillas de detalle que usan
 * cover_media_id directamente (tool/insight/other) — /work/[slug] no lo
 * usa porque su imagen de OG sale del carrusel de caso, no de la
 * portada (case/episode no rellenan cover_media_id, especificacion-
 * final-formato-detalle.md §3).
 */
export function buildContentMetadata(content: PublicContent): Metadata {
  const title = content.seoTitle ?? content.title
  const description = content.seoDescription ?? content.summary ?? undefined

  const ogImage =
    content.coverMedia && content.coverMedia.kind === 'image'
      ? buildImageUrl(content.coverMedia.cloudinaryPublicId, 'detail', 1200)
      : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

import type { Metadata } from 'next'
import {
  buildImageUrl,
  buildVideoPosterUrl,
} from '@/modules/media/infrastructure/cloudinaryUrl'
import type {
  PublicContent,
  PublicContentMedia,
} from '@/modules/content/infrastructure/publicContentSource'

/**
 * generateMetadata compartido por las plantillas de detalle que usan
 * cover_media_id directamente (tool/insight/other) — /work/[slug] no lo
 * usa porque su imagen de OG sale del carrusel de caso, no de la
 * portada (case/episode no rellenan cover_media_id, especificacion-
 * final-formato-detalle.md §3).
 */
export function buildContentMetadata(
  content: PublicContent,
  options?: {
    noindex?: boolean
    // Medio de respaldo para la imagen de OG cuando el contenido no tiene
    // portada (tool/insight, §2.40): primer medio de su primer pin.
    shareMedia?: PublicContentMedia | null
  },
): Metadata {
  const title = content.seoTitle ?? content.title
  const description = content.seoDescription ?? content.summary ?? undefined

  const ogImage = buildOgImage(content.coverMedia ?? options?.shareMedia)

  return {
    title,
    description,
    // Preview (arquitectura §15.3): "noindex" — un borrador no debe
    // aparecer nunca en buscadores, aunque el link llegue a filtrarse.
    robots: options?.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

function buildOgImage(media: PublicContentMedia | null | undefined) {
  if (!media) return undefined
  return media.kind === 'image'
    ? buildImageUrl(media.cloudinaryPublicId, 'detail', 1200)
    : buildVideoPosterUrl(media.cloudinaryPublicId, { width: 1200 }, 'detail')
}

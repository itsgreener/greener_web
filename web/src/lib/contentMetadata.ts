import type { Metadata } from 'next'
import { buildOpenGraph } from '@/lib/pageMetadata'
import {
  buildImageUrl,
  buildVideoPosterUrl,
} from '@/modules/media/client/cloudinaryUrl'
import type {
  PublicContent,
  PublicContentMedia,
} from '@/modules/content/domain/publicContent'

/**
 * generateMetadata compartido por las fichas de tool e insight. /work/[slug]
 * no lo usa porque su imagen de OG sale del carrusel de caso.
 */
export function buildContentMetadata(
  content: PublicContent,
  options?: {
    noindex?: boolean
    // Imagen de OG de la ficha (tool/insight no tienen portada, §2.40): el
    // medio del pin pedido (?pin=) o, si no, el de su primer pin.
    shareMedia?: PublicContentMedia | null
  },
): Metadata {
  const title = content.seoTitle ?? content.title
  const description = content.seoDescription ?? content.summary ?? undefined

  const ogImage = buildOgImage(options?.shareMedia)

  return {
    title,
    description,
    // Preview (arquitectura §15.3): "noindex" — un borrador no debe
    // aparecer nunca en buscadores, aunque el link llegue a filtrarse.
    robots: options?.noindex ? { index: false, follow: false } : undefined,
    // Sin imagen propia, la de marca por defecto (RES-C3).
    openGraph: buildOpenGraph({
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    }),
  }
}

function buildOgImage(media: PublicContentMedia | null | undefined) {
  if (!media) return undefined
  return media.kind === 'image'
    ? buildImageUrl(media.cloudinaryPublicId, 'detail', 1200)
    : buildVideoPosterUrl(media.cloudinaryPublicId, { width: 1200 }, 'detail')
}

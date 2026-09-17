import type { Metadata } from 'next'
import { getContentBySlug } from '@/modules/content/application/getContentBySlug'
import { getPublicCaseCarousel } from '@/modules/content/application/getPublicCaseCarousel'
import { buildImageUrl } from '@/modules/media/infrastructure/cloudinaryUrl'
import type { Locale } from '@/modules/content/domain/contentSchema'

/**
 * Compartido por /work/[slug] (canónica) y /work/[slug]/[locale]
 * (variantes de idioma, arquitectura §7.7 — solo caso, nunca episodio:
 * "el episodio... no se traduce", §7.4).
 */
export async function getWorkContent(slug: string, locale?: Locale) {
  const content = await getContentBySlug(slug, locale)
  if (!content || (content.type !== 'case' && content.type !== 'episode')) {
    return null
  }
  return content
}

type WorkContent = NonNullable<Awaited<ReturnType<typeof getWorkContent>>>

export async function buildWorkMetadata(
  content: WorkContent,
): Promise<Metadata> {
  const title = content.seoTitle ?? content.title
  const description = content.seoDescription ?? content.summary ?? undefined

  // og_media_id es cover_media_id, que caso/episodio no rellenan (§3: es
  // exclusivo de tool/insight/other) — para un caso se usa la primera
  // imagen de su carrusel; un episodio, sin thumbnail propio, se queda
  // sin imagen de compartición por ahora.
  let ogImage: string | undefined
  if (content.type === 'case') {
    const carousel = await getPublicCaseCarousel(content.id)
    const firstImage = carousel.find((item) => item.kind === 'image')
    if (firstImage) {
      ogImage = buildImageUrl(firstImage.cloudinaryPublicId, 'detail', 1200)
    }
  }

  // hreflang (arquitectura §18.1: "hreflang en casos traducidos") — solo
  // tiene más de un elemento para un caso con varias traducciones
  // publicadas; para todo lo demás, availableLocales trae un único
  // locale y esto no aporta nada, pero tampoco estorba.
  const languages: Record<string, string> = {}
  for (const loc of content.availableLocales) {
    languages[loc] =
      loc === content.defaultLocale
        ? `/work/${content.slug}`
        : `/work/${content.slug}/${loc}`
  }

  return {
    title,
    description,
    alternates: { languages },
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

import type { Metadata } from 'next'
import { buildOpenGraph } from '@/lib/pageMetadata'
import { publicContent } from '@/modules/content/container'
import { workLocalePath } from '@/modules/content/domain/contentPath'
import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'
import { buildImageUrl } from '@/modules/media/client/cloudinaryUrl'
import type { Locale } from '@/modules/shared/domain/locale'
/**
 * Compartido por /work/[slug] (canónica) y /work/[slug]/[locale]
 * (variantes de idioma, arquitectura §7.7 — solo caso, nunca episodio:
 * "el episodio... no se traduce", §7.4).
 */
export async function getWorkContent(slug: string, locale?: Locale) {
  const content = await publicContent.contentBySlug(slug, locale)
  if (!content || (content.type !== 'case' && content.type !== 'episode')) {
    return null
  }
  return content
}

type WorkContent = NonNullable<Awaited<ReturnType<typeof getWorkContent>>>

export async function buildWorkMetadata(
  content: WorkContent,
  options?: { reader?: PublicContentReader; noindex?: boolean },
): Promise<Metadata> {
  const title = content.seoTitle ?? content.title
  // Case y episodio ya no tienen summary: la descripción es solo la SEO.
  const description = content.seoDescription ?? undefined

  // Caso y episodio no tienen imagen de compartición propia (og_media_id):
  // para un caso se usa la primera imagen de su carrusel; un episodio, sin
  // thumbnail propio, usa la imagen de marca por defecto.
  let ogImage: string | undefined
  if (content.type === 'case') {
    const carousel = await (options?.reader ?? publicContent).caseCarousel(
      content.id,
    )
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
    languages[loc] = workLocalePath(content.slug, loc, content.defaultLocale)
  }

  return {
    title,
    description,
    alternates: { languages },
    // Preview (arquitectura §15.3): "noindex" — un borrador no debe
    // aparecer nunca en buscadores, aunque el link llegue a filtrarse.
    robots: options?.noindex ? { index: false, follow: false } : undefined,
    // Un episodio, o un caso sin imagen en el carrusel, comparte la imagen de
    // marca por defecto (RES-C3).
    openGraph: buildOpenGraph({
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    }),
  }
}

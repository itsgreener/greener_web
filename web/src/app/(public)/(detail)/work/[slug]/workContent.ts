import type { Metadata } from 'next'
import { buildOpenGraph } from '@/lib/pageMetadata'
import { publicContent } from '@/modules/content/container'
import { workLocalePath } from '@/modules/content/domain/contentPath'
import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'
import type { PublicCaseCarouselItem } from '@/modules/content/domain/publicContent'
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

/**
 * Imagen de un caso para compartir y para sus datos estructurados: la primera
 * imagen (no vídeo) de su carrusel. Sin ella, undefined.
 */
export function firstCarouselImageUrl(
  carousel: readonly PublicCaseCarouselItem[],
): string | undefined {
  const firstImage = carousel.find((item) => item.kind === 'image')

  return firstImage
    ? buildImageUrl(firstImage.cloudinaryPublicId, 'detail', 1200)
    : undefined
}

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
    ogImage = firstCarouselImageUrl(carousel)
  }

  // hreflang (arquitectura §18.1: "hreflang en casos traducidos"): solo para
  // un caso con varias traducciones publicadas. Para todo lo demás
  // (availableLocales trae un único locale) no hay nada que alternar y no se
  // emite, igual que en el sitemap. `x-default` es la versión para quien no
  // encaja en ningún idioma listado: la canónica (idioma por defecto).
  let languages: Record<string, string> | undefined
  if (content.availableLocales.length > 1) {
    languages = {}
    for (const loc of content.availableLocales) {
      languages[loc] = workLocalePath(content.slug, loc, content.defaultLocale)
    }
    languages['x-default'] = workLocalePath(
      content.slug,
      content.defaultLocale,
      content.defaultLocale,
    )
  }

  return {
    title,
    description,
    // Canónica de ESTA URL: cada idioma se apunta a sí mismo (la variante
    // /work/x/en no declara como canónica la /work/x). En preview no hay URL
    // pública a la que apuntar, y un noindex no anuncia alternativas.
    alternates: options?.noindex
      ? undefined
      : {
          canonical: workLocalePath(
            content.slug,
            content.locale,
            content.defaultLocale,
          ),
          languages,
        },
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

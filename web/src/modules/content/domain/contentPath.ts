import type { ContentType } from '@/modules/shared/domain/contentType'
import type { Locale } from '@/modules/shared/domain/locale'

/**
 * especificacion-final-formato-detalle.md §7: case/episode comparten
 * /work/[slug] (detalle tipo B); tool tiene ruta propia (detalle tipo A);
 * insight no tiene ficha: su ruta pública es el paquete HTML,
 * /insights/[slug]/app (/insights/[slug] redirige allí); other (página
 * satélite) tampoco tiene ficha: su ruta pública es el paquete,
 * /variety/[slug]/app (/variety/[slug] redirige allí). Un other de tipo
 * newsletter no tiene página: es un pin del feed.
 */
export function publicContentPath(type: ContentType, slug: string): string {
  switch (type) {
    case 'case':
    case 'episode':
      return `/work/${slug}`
    case 'tool':
      return `/tools/${slug}`
    case 'insight':
      return `/insights/${slug}/app`
    case 'other':
      return `/variety/${slug}/app`
  }
}

/**
 * Ruta de un caso en un idioma: `/work/{slug}` en el idioma por defecto
 * (arquitectura §7.7: la canónica no lleva segmento de idioma, para no servir
 * el mismo contenido bajo dos URLs) y `/work/{slug}/{locale}` en los demás.
 * La usan el selector de idioma, el hreflang, el sitemap y la redirección de
 * `/work/{slug}/{locale}`.
 */
export function workLocalePath(
  slug: string,
  locale: Locale,
  defaultLocale: Locale,
): string {
  const canonical = publicContentPath('case', slug)

  return locale === defaultLocale ? canonical : `${canonical}/${locale}`
}

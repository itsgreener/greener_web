import type { ContentType } from '@/modules/shared/domain/contentType'
/**
 * especificacion-final-formato-detalle.md §7: case/episode comparten
 * /work/[slug] (detalle tipo B); tool/insight tienen ruta propia
 * (detalle tipo A); other vive en /variety/[slug].
 */
export function publicContentPath(type: ContentType, slug: string): string {
  switch (type) {
    case 'case':
    case 'episode':
      return `/work/${slug}`
    case 'tool':
      return `/tools/${slug}`
    case 'insight':
      return `/insights/${slug}`
    case 'other':
      return `/variety/${slug}`
  }
}

/**
 * Destino al que lleva un PIN del feed (home, subhomes y relacionados).
 *
 * Igual que `publicContentPath` salvo en insights: el pin salta la página
 * de detalle (/insights/[slug]) y abre directamente el contenido real en
 * /insights/[slug]/app. La página de detalle sigue siendo la URL canónica
 * (sitemap, preview, compartir); solo el feed no pasa por ella.
 *
 * Las tools NO cambian: siguen yendo a /tools/[slug].
 */
export function feedPinDestination(type: ContentType, slug: string): string {
  const path = publicContentPath(type, slug)
  return type === 'insight' ? `${path}/app` : path
}

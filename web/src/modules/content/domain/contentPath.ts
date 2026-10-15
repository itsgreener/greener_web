import type { ContentType } from '@/modules/shared/domain/contentType'
/**
 * especificacion-final-formato-detalle.md §7: case/episode comparten
 * /work/[slug] (detalle tipo B); tool tiene ruta propia (detalle tipo A);
 * insight no tiene ficha: su ruta pública es el paquete HTML,
 * /insights/[slug]/app (/insights/[slug] redirige allí); other vive en
 * /variety/[slug].
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
      return `/variety/${slug}`
  }
}

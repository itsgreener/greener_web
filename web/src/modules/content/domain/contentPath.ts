import type { ContentType } from './contentSchema'

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

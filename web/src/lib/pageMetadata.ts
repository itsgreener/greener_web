import type { Metadata } from 'next'

/**
 * Piezas comunes de los metadatos de las páginas públicas.
 *
 * Por qué existe: Next fusiona los metadatos de forma SUPERFICIAL. Si el
 * layout raíz define `openGraph.images`, cualquier página que declare su
 * propio objeto `openGraph` lo sustituye entero y pierde la imagen por
 * defecto (justo las fichas de tool, insight, caso y episodio sin medio
 * propio). Por eso todas pasan por `buildOpenGraph`, que añade la imagen por
 * defecto cuando no hay una propia (RES-C3).
 */

export const SITE_NAME = 'Greener'

/**
 * Imagen para compartir cuando una página no tiene la suya. Vive en `public/`
 * y no en la CDN de medios a propósito: así no depende de la migración de
 * Cloudinary. 1200 × 630 es la proporción que esperan las redes. Nombre
 * reservado en `reservedSlugs.ts`.
 */
export const DEFAULT_OG_IMAGE = {
  url: '/og-default.png',
  width: 1200,
  height: 630,
  alt: SITE_NAME,
} as const

type OpenGraph = NonNullable<Metadata['openGraph']>

export function buildOpenGraph(input: {
  title?: string
  description?: string
  /** URLs absolutas de la imagen propia de la página, si la tiene. */
  images?: readonly string[]
}): OpenGraph {
  return {
    type: 'website',
    siteName: SITE_NAME,
    title: input.title,
    description: input.description,
    images:
      input.images && input.images.length > 0
        ? [...input.images]
        : [DEFAULT_OG_IMAGE],
  }
}

/**
 * Metadatos de una página fija (subhomes, contacto, privacidad). El título
 * lleva el sufijo « · Greener» de la plantilla del layout raíz, salvo con
 * `absoluteTitle` (la home, que lo lleva ya dentro).
 */
export function buildPageMetadata(input: {
  title: string
  description: string
  absoluteTitle?: boolean
}): Metadata {
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    openGraph: buildOpenGraph({
      title: input.title,
      description: input.description,
    }),
  }
}

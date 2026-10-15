import type { ContentType } from '@/modules/shared/domain/contentType'
import type { Locale } from '@/modules/shared/domain/locale'
import type { PinRatioValue } from '@/modules/shared/domain/ratio'

import type { EpisodeKind, EpisodeProgram } from './episodeLabels'
import type { EpisodeProvider } from './episodeSchema'

/**
 * Modelos de lectura de la web pública: lo que necesitan las páginas de
 * detalle, ya sin nada de la base de datos.
 */

export interface PublicContentMedia {
  kind: 'image' | 'video'
  cloudinaryPublicId: string
}

export interface PublicContent {
  id: string
  type: ContentType
  slug: string
  defaultLocale: Locale
  // El locale de la traducción devuelta — normalmente igual a
  // defaultLocale (ruta canónica /work/[slug]), o el pedido
  // explícitamente en /work/[slug]/[locale] (arquitectura §7.7).
  locale: Locale
  // Todos los locales con content_translation publicada para este
  // contenido — "el selector de idioma... solo muestra los locales con
  // content_translation publicada, nunca los tres por defecto" (§7.7).
  // Para tool/insight/other/episode esto es siempre un único elemento
  // (default_locale): son de un solo idioma (§7.4, episode) o
  // simplemente no tienen selector construido todavía.
  availableLocales: Locale[]
  title: string
  seoTitle: string | null
  seoDescription: string | null
  summary: string | null
  highlight: string | null
  body: string | null
}

/**
 * Portada de una ficha tomada de un pin concreto (`?pin=<id>`): el medio del
 * pin, su ratio y su alt (obligatorio: lo usa el vídeo de la ficha).
 */
export interface PublicPinCover {
  media: PublicContentMedia
  ratio: PinRatioValue
  alt: string
}

export interface PublicCaseDetail {
  // force es un parámetro del motor de feed (arquitectura §4.3), nunca se
  // muestra en el detalle — por eso no se lee aquí.
  client: string | null
}

export interface PublicCaseCarouselItem {
  mediaId: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  sortOrder: number
  alt: string
  width: number
  height: number
}

export interface PublicEpisode {
  program: EpisodeProgram
  provider: EpisodeProvider
  embedId: string
  episodeKind: EpisodeKind
}

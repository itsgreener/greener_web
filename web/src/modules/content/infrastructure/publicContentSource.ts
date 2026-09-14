import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type { ContentType, Locale } from '../domain/contentSchema'

/**
 * Lectura pública de un contenido por slug — para las plantillas de
 * detalle (/work/[slug] hoy, /tools|insights/[slug] cuando existan). A
 * propósito NO reutiliza supabaseContentRepository.ts: ese repositorio
 * está pensado para el ABM (createClient(), sigue la sesión del admin) y
 * siempre necesita las traducciones de los tres locales para los
 * formularios; aquí solo hace falta el locale por defecto (sin selector
 * de idioma en el detalle todavía) y ninguna operación de escritura.
 * Mismo patrón que modules/feed/infrastructure/supabaseFeedSource.ts:
 * funciones sueltas sobre createPublicReadClient(), que ya respeta RLS
 * ("solo contenido publicado") sin necesitar sesión de usuario.
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
  title: string
  seoTitle: string | null
  seoDescription: string | null
  summary: string | null
  highlight: string | null
  body: string | null
  coverMedia: PublicContentMedia | null
}

interface ContentBySlugRow {
  id: string
  type: ContentType
  slug: string
  default_locale: Locale
  translations: Array<{
    locale: Locale
    title: string
    seo_title: string | null
    seo_description: string | null
    summary: string | null
    highlight: string | null
    body: string | null
  }>
  cover_media: {
    kind: 'image' | 'video'
    cloudinary_public_id: string
  } | null
}

/**
 * Devuelve null si no existe ningún contenido publicado con ese slug —
 * ni distingue entre "no existe" y "existe pero no está publicado" (RLS
 * ya filtra por status=published antes de que este código vea la fila),
 * que es justo el comportamiento que queremos: ambos casos son un 404
 * público, no hay nada más que decir en cualquiera de los dos.
 */
export async function getContentBySlug(
  slug: string,
  client: SupabaseClient = createPublicReadClient(),
): Promise<PublicContent | null> {
  const { data, error } = await client
    .from('content')
    .select(
      `
      id,
      type,
      slug,
      default_locale,
      translations:content_translation (
        locale,
        title,
        seo_title,
        seo_description,
        summary,
        highlight,
        body
      ),
      cover_media:media_asset!cover_media_id ( kind, cloudinary_public_id )
    `,
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo leer el contenido por slug: ${error.message}`)
  }

  if (!data) return null

  const row = data as unknown as ContentBySlugRow
  const translation = row.translations.find(
    (item) => item.locale === row.default_locale,
  )

  if (!translation) return null

  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    defaultLocale: row.default_locale,
    title: translation.title,
    seoTitle: translation.seo_title,
    seoDescription: translation.seo_description,
    summary: translation.summary,
    highlight: translation.highlight,
    body: translation.body,
    coverMedia: row.cover_media
      ? {
          kind: row.cover_media.kind,
          cloudinaryPublicId: row.cover_media.cloudinary_public_id,
        }
      : null,
  }
}

import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type { PublicContent } from '@/modules/content/domain/publicContent'
import type { Locale } from '@/modules/shared/domain/locale'
/**
 * Lectura pública de un contenido por slug — para las plantillas de
 * detalle (/work/[slug], /tools|insights/[slug]). A propósito NO
 * reutiliza supabaseContentRepository.ts: ese repositorio está pensado
 * para el ABM (createClient(), sigue la sesión del admin) y siempre
 * necesita las traducciones de los tres locales para los formularios;
 * aquí solo hace falta UNA traducción por petición y ninguna operación
 * de escritura. Mismo patrón que
 * modules/feed/infrastructure/supabaseFeedSource.ts: funciones sueltas
 * sobre createPublicReadClient(), que ya respeta RLS ("solo contenido
 * publicado") sin necesitar sesión de usuario.
 */

/**
 * Devuelve null si no existe ningún contenido publicado con ese slug, o
 * si se pide un `requestedLocale` concreto que no tiene traducción
 * publicada (nunca cae en silencio al locale por defecto — una URL
 * /work/{slug}/en sin traducción al inglés es un 404 real, no una
 * versión en español servida bajo una URL que dice "en"). Sin
 * `requestedLocale`, usa default_locale (ruta canónica). Tampoco
 * distingue "no existe" de "existe pero no está publicado" (RLS ya
 * filtra por status=published antes de que este código vea la fila) —
 * ambos casos son un 404 público, no hay nada más que decir.
 */
export async function getContentBySlug(
  slug: string,
  requestedLocale?: Locale,
  client: AppSupabaseClient = createPublicReadClient(),
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
      )
    `,
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo leer el contenido por slug: ${error.message}`)
  }

  if (!data) return null

  const row = data
  const targetLocale = requestedLocale ?? row.default_locale
  const translation = row.translations.find(
    (item) => item.locale === targetLocale,
  )

  if (!translation) return null

  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    defaultLocale: row.default_locale,
    locale: targetLocale,
    availableLocales: row.translations.map((item) => item.locale),
    title: translation.title,
    seoTitle: translation.seo_title,
    seoDescription: translation.seo_description,
    summary: translation.summary,
    highlight: translation.highlight,
    body: translation.body,
  }
}

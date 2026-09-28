import type { SupabaseClient } from '@supabase/supabase-js'

import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type { Locale, ContentType } from '../domain/contentSchema'
import type { SitemapContentRow } from '../domain/sitemap'

// Supabase (PostgREST) devuelve como mucho 1000 filas por petición por
// defecto. El catálogo previsto (100-300 casos + tools + insights +
// episodios) queda por debajo, pero un sitemap que se trunca en silencio
// es un fallo que nadie ve — por eso se pagina.
const PAGE_SIZE = 1000

interface SitemapRow {
  type: ContentType
  slug: string
  default_locale: Locale
  updated_at: string
  translations: Array<{ locale: Locale }>
}

/**
 * Todo el contenido publicado, para el sitemap. RLS ya filtra por
 * status=published (content_public_read); el `.eq` es explícito solo para
 * que la intención se lea en el propio código. Mismo patrón que
 * publicContentSource.ts: cliente público, sin sesión.
 */
export async function listPublishedForSitemap(
  client: SupabaseClient = createPublicReadClient(),
): Promise<SitemapContentRow[]> {
  const result: SitemapContentRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('content')
      .select(
        'type, slug, default_locale, updated_at, translations:content_translation ( locale )',
      )
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      // Desempate: sin él, dos filas con el mismo updated_at pueden
      // saltarse o repetirse entre páginas.
      .order('slug', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(
        `No se pudo leer el contenido publicado para el sitemap: ${error.message}`,
      )
    }

    const rows = (data ?? []) as unknown as SitemapRow[]

    for (const row of rows) {
      result.push({
        type: row.type,
        slug: row.slug,
        defaultLocale: row.default_locale,
        updatedAt: row.updated_at,
        locales: row.translations.map((item) => item.locale),
      })
    }

    if (rows.length < PAGE_SIZE) {
      break
    }
  }

  return result
}

import type { ContentType } from '@/modules/shared/domain/contentType'
import type { Locale } from '@/modules/shared/domain/locale'
import { publicContentPath, workLocalePath } from './contentPath'
/**
 * Sitemap (arquitectura §18.1: "Sitemap automático de contenidos
 * publicados y hreflang en casos traducidos"). Dominio puro — recibe las
 * filas ya leídas y devuelve las entradas; nada de Next.js ni Supabase.
 */

export interface SitemapContentRow {
  type: ContentType
  slug: string
  defaultLocale: Locale
  updatedAt: string
  // Locales con content_translation publicada (el de por defecto incluido).
  locales: Locale[]
}

export interface SitemapEntry {
  url: string
  lastModified?: Date
  alternates?: { languages: Record<string, string> }
}

// Páginas fijas indexables. Ni /admin, ni /api, ni /auth, ni /preview
// (ver src/app/robots.ts). /work es la subhome de casos: no duplica la home
// (la home mezcla todos los tipos), así que va como las otras tres subhomes.
export const STATIC_SITEMAP_PATHS = [
  '/',
  '/work',
  '/channel',
  '/insights',
  '/tools',
  '/contact',
  '/privacy',
] as const

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function buildSitemapEntries(
  rows: SitemapContentRow[],
  siteUrl: string,
): SitemapEntry[] {
  const base = stripTrailingSlash(siteUrl)
  const entries: SitemapEntry[] = STATIC_SITEMAP_PATHS.map((path) => ({
    url: path === '/' ? `${base}/` : `${base}${path}`,
  }))

  for (const row of rows) {
    // Las páginas satélite (`other`) no entran en el sitemap (plan de `other`,
    // §6.8): se llega a ellas desde el feed, no por búsqueda.
    if (row.type === 'other') continue

    const canonicalPath = publicContentPath(row.type, row.slug)
    const canonicalUrl = `${base}${canonicalPath}`
    const parsedDate = new Date(row.updatedAt)
    const lastModified = Number.isNaN(parsedDate.getTime())
      ? undefined
      : parsedDate

    // Solo /work/[slug] tiene rutas por idioma (/work/[slug]/[locale],
    // arquitectura §7.7). Tool, insight y other son de un solo idioma.
    const hasLocaleRoutes = canonicalPath.startsWith('/work/')
    const extraLocales = hasLocaleRoutes
      ? [...new Set(row.locales)].filter(
          (locale) => locale !== row.defaultLocale,
        )
      : []

    if (extraLocales.length === 0) {
      entries.push({ url: canonicalUrl, lastModified })
      continue
    }

    // hreflang: la versión por defecto en la URL canónica y cada idioma
    // adicional en /work/[slug]/[locale] — igual que el <head> de la
    // propia página (workContent.ts).
    const languages: Record<string, string> = {
      [row.defaultLocale]: canonicalUrl,
    }
    for (const locale of extraLocales) {
      languages[locale] =
        `${base}${workLocalePath(row.slug, locale, row.defaultLocale)}`
    }

    entries.push({ url: canonicalUrl, lastModified, alternates: { languages } })

    for (const locale of extraLocales) {
      entries.push({
        url: `${base}${workLocalePath(row.slug, locale, row.defaultLocale)}`,
        lastModified,
        alternates: { languages },
      })
    }
  }

  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (seen.has(entry.url)) {
      return false
    }
    seen.add(entry.url)
    return true
  })
}

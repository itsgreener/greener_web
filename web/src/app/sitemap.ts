import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'
import { buildSitemapEntries } from '@/modules/content/domain/sitemap'
import { listPublishedForSitemap } from '@/modules/content/infrastructure/publicSitemapSource'

// Se genera en cada petición: depende del contenido publicado en ese
// momento (y, en el build, no hay ni datos reales ni por qué consultarlos).
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await listPublishedForSitemap()

  return buildSitemapEntries(rows, env.NEXT_PUBLIC_SITE_URL)
}

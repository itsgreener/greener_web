import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'

// Dinámico a propósito: la URL del sitemap sale de NEXT_PUBLIC_SITE_URL,
// y si se dejara estático se congelaría con el valor que hubiera al hacer
// el build (localhost si faltaba).
export const dynamic = 'force-dynamic'

/**
 * Rutas que no deben rastrearse:
 * /admin y /api/admin — el ABM (además ya exige sesión).
 * /api — endpoints internos del feed y del contacto, sin contenido.
 * /auth — callback de OAuth.
 * /preview — demos de desarrollo (masonry).
 * Los borradores compartidos por link (?preview=<token>) ya salen con
 * noindex en su propio <head>; robots.txt no puede filtrar por query
 * y no hace falta.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/auth', '/preview'],
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  }
}

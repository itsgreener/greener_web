import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'
import { TRAP_PATH } from '@/lib/botTraps'

// Dinámico a propósito: la URL del sitemap sale de NEXT_PUBLIC_SITE_URL,
// y si se dejara estático se congelaría con el valor que hubiera al hacer
// el build (localhost si faltaba).
export const dynamic = 'force-dynamic'

/**
 * Rutas que no deben rastrearse:
 * /admin y /api/admin — el ABM (además ya exige sesión).
 * /api — endpoints internos del feed y del contacto, sin contenido.
 * /auth — callback de OAuth.
 * TRAP_PATH — señuelo para bots que ignoran este fichero (lib/botTraps.ts).
 *
 * Todo lo demás está abierto a propósito: los buscadores y los asistentes de
 * IA que buscan y citan (Googlebot, OAI-SearchBot, PerplexityBot…) siguen el
 * sitemap y llms.txt (ver app/llms.txt). Si algún día se quiere cerrar el
 * paso a los bots de entrenamiento (GPTBot, CCBot, Google-Extended…), se
 * añade una regla por user-agent con `disallow: '/'` en este array.
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
        disallow: ['/admin', '/api/', '/auth', TRAP_PATH],
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  }
}

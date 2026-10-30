/**
 * Primeros segmentos de URL que ya son de la web (rutas, estáticos y ficheros
 * especiales). Una página satélite se alcanza también en `/{slug}`, que
 * redirige a `/variety/{slug}/app` (`src/app/(public)/[slug]/page.tsx`); en
 * Next.js una ruta estática gana siempre a la dinámica, así que una página
 * con uno de estos slugs seguiría funcionando en `/variety/{slug}/app` pero su
 * URL corta nunca llegaría a ella. Por eso el alta de una página los rechaza.
 *
 * `tests/unit/content/reservedSlugs.test.ts` compara esta lista con las
 * carpetas reales de `src/app` y `public`: una ruta nueva sin añadir aquí
 * rompe ese test.
 */
export const RESERVED_ROOT_SEGMENTS: readonly string[] = [
  // Rutas de `src/app`
  'admin',
  'api',
  'auth',
  'channel',
  'contact',
  'insights',
  'llms.txt',
  'privacy',
  'robots.txt',
  'sitemap.xml',
  'tools',
  'variety',
  'work',

  // Ficheros y carpetas de `public`, y rutas que sirve Next.js
  'apple-touch-icon.png',
  'favicon.ico',
  'greener-package-analytics.js',
  'icons',
  'og-default.png',
  '_next',

  // Señuelo para bots (`lib/botTraps.ts`)
  'internal',
]

export function isReservedRootSegment(slug: string): boolean {
  return RESERVED_ROOT_SEGMENTS.includes(slug.toLowerCase())
}

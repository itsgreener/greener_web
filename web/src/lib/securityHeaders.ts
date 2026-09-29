/**
 * Cabeceras de seguridad globales (arquitectura §17.1; decisión del 22
 * de septiembre). Dominio puro — nada de Next.js/Edge aquí, para poder
 * testear la construcción de la cabecera sin levantar un request real.
 *
 * NUNCA se aplican a `/tools|insights/[slug]/app`: esas rutas llevan su
 * propia CSP, pensada para el contrato del ZIP
 * (`contrato-zip-tools-insights.md` §12.4). Dos cabeceras
 * `Content-Security-Policy` en la misma respuesta no se sustituyen, se
 * combinan (el navegador aplica la intersección de ambas) — mandar las
 * dos a la vez podría romper `worker-src`/`canvas` sin ningún error
 * visible. Ver `src/proxy.ts` para la exclusión real.
 *
 * `style-src` se queda en `'unsafe-inline'` a propósito, no es una
 * concesión temporal: los nonces de CSP solo cubren elementos
 * `<style>`, nunca el atributo `style="..."` de un elemento normal, y
 * el panel de recomendaciones (`ToolInsightDetail`/`CaseDetail`/
 * `EpisodeDetail`, `useRecommendationMasonry`) lo usa a propósito para
 * el posicionamiento calculado en cliente del masonry — no hay nonce
 * que cubra eso sin reescribir ese sistema entero a variables CSS.
 *
 * `script-src` sí lleva nonce + `'strict-dynamic'`, el mecanismo que el
 * propio Next.js documenta: el nonce se manda tanto en la petición
 * (para que el runtime de Next lo aplique a sus propios scripts de
 * hidratación/streaming) como en la respuesta (para que el navegador lo
 * exija) — ver cómo se usa en `src/proxy.ts`. En desarrollo (`isDev`)
 * se añade además `'unsafe-eval'`, solo ahí: React usa `eval()` en modo
 * desarrollo para reconstruir callstacks entre entornos y para Fast
 * Refresh — nunca en producción (decisión del 22 sep, tras verse el
 * aviso real de CSP en `npm run dev`).
 */

export interface SecurityHeadersInput {
  nonce: string
  supabaseUrl: string
  // React usa eval() en modo desarrollo para varias herramientas de
  // depuración (reconstruir callstacks entre entornos, Fast Refresh) —
  // "React will never use eval() in production mode", tal cual lo dice
  // el propio aviso del navegador. Sin esto, `npm run dev` funciona
  // pero llena la consola de avisos de CSP; en producción NUNCA se pasa
  // `true` aquí, así que la política de producción se queda tan
  // estricta como estaba.
  isDev: boolean
  // Plausible está configurado (NEXT_PUBLIC_PLAUSIBLE_DOMAIN). El tracker
  // publica cada evento con `fetch` en https://plausible.io/api/event;
  // sin este origen en `connect-src`, el navegador bloquea la petición en
  // silencio y NINGÚN evento llega (fallo real encontrado el 28 sep: la CSP
  // se añadió el 22 de septiembre, un día antes que la integración de
  // Plausible, y nadie comprobó que encajaran). Solo se abre si hay analítica
  // configurada: sin ella, ese origen no hace falta.
  analyticsEnabled?: boolean
}

// Endpoint de eventos del tracker de Plausible (su valor por defecto, que es el
// que usa el paquete al no configurarse otro). Si algún día se alojara
// Plausible en un dominio propio, cambiar aquí y en analytics.ts.
const PLAUSIBLE_EVENTS_ORIGIN = 'https://plausible.io'

const CLOUDINARY_DELIVERY_ORIGIN = 'https://res.cloudinary.com'
// Subida directa desde el navegador (arquitectura §9.2: "El navegador
// sube el archivo directamente a Cloudinary con esa firma, sin pasar
// por el servidor de la aplicación") — sin esto en connect-src, la
// subida de medios del ABM se rompe en cuanto la CSP entra en vigor.
const CLOUDINARY_UPLOAD_ORIGIN = 'https://api.cloudinary.com'

// Embeds de episodio (§3.3, EpisodeDetail.tsx) — youtube-nocookie,
// Vimeo y Spotify, los tres proveedores reales que soporta hoy.
const EMBED_FRAME_ORIGINS = [
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://open.spotify.com',
] as const

export function buildContentSecurityPolicy({
  nonce,
  supabaseUrl,
  isDev,
  analyticsEnabled = false,
}: SecurityHeadersInput): string {
  const supabaseOrigin = new URL(supabaseUrl).origin

  const connectSources = [
    `'self'`,
    supabaseOrigin,
    CLOUDINARY_UPLOAD_ORIGIN,
    ...(analyticsEnabled ? [PLAUSIBLE_EVENTS_ORIGIN] : []),
  ]

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: ${CLOUDINARY_DELIVERY_ORIGIN}`,
    // <video src> del carrusel de caso, el pin con vídeo y la portada de
    // vídeo de `other` — plano, sin next/image de por medio (no se usa
    // en ningún sitio del proyecto), así que esto es real, no una
    // precaución de más.
    `media-src 'self' ${CLOUDINARY_DELIVERY_ORIGIN}`,
    `font-src 'self'`,
    `connect-src ${connectSources.join(' ')}`,
    `frame-src ${EMBED_FRAME_ORIGINS.join(' ')}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ]

  return directives.join('; ')
}

export function buildSecurityHeaders(
  input: SecurityHeadersInput,
): Record<string, string> {
  return {
    'Content-Security-Policy': buildContentSecurityPolicy(input),
    // 2 años + subdominios + preload: arquitectura §17.1 solo pide HSTS
    // sin más detalle — este es el valor estándar recomendado para
    // preload (Chromium/Firefox exigen ≥1 año, includeSubDomains y
    // preload presentes para aceptar una entrada en la lista preload).
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

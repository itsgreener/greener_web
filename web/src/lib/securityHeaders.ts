/**
 * Cabeceras de seguridad globales (arquitectura §17.1). Dominio puro — nada
 * de Next.js/Edge aquí, para testear la construcción sin levantar un request.
 *
 * NUNCA se aplican a `/tools|insights/[slug]/app`: esas rutas llevan su
 * propia CSP (`contrato-zip-tools-insights.md` §12.4) y dos
 * `Content-Security-Policy` en una respuesta se combinan (intersección), lo
 * que podría romper `worker-src`/`canvas` sin error visible. Ver `src/proxy.ts`.
 *
 * `style-src` lleva `'unsafe-inline'` a propósito: los nonces solo cubren
 * `<style>`, no el atributo `style="..."`, y el masonry posiciona sus
 * tarjetas con estilos calculados en cliente.
 *
 * `script-src` lleva nonce + `'strict-dynamic'` (el mecanismo documentado por
 * Next): el nonce va en la petición y en la respuesta (`src/proxy.ts`). Solo
 * en desarrollo (`isDev`) se añade `'unsafe-eval'`, que React necesita allí.
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
  // silencio y NINGÚN evento llega. Solo se abre si hay analítica
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
    `img-src 'self' data: blob: ${CLOUDINARY_DELIVERY_ORIGIN}`,
    // <video src> del carrusel de caso, el pin con vídeo y la portada de
    // vídeo de `other` — plano, sin next/image de por medio (no se usa
    // en ningún sitio del proyecto), así que esto es real, no una
    // precaución de más.
    `media-src 'self' blob: ${CLOUDINARY_DELIVERY_ORIGIN}`,
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

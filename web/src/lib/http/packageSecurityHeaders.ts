/**
 * Cabeceras de seguridad de las rutas que sirven un paquete HTML (tools,
 * insights y páginas satélite). `src/proxy.ts` salta estas rutas por completo
 * para no mezclar la CSP global con la suya, así que NINGUNA cabecera global
 * les llega: todas las respuestas de estas rutas (200, 304, 404, 503), las del
 * documento y las de los assets, tienen que ponerse aquí.
 *
 * Auditoría de seguridad del 23 oct: SEC-PUB-B1 (assets `.html`/`.svg` sin
 * CSP) y SEC-PUB-B2 (CSP del documento incompleta, cabeceras solo en el 200).
 */

/**
 * Las que llevan TODAS las respuestas de estas rutas. Mismos valores que
 * `src/lib/securityHeaders.ts`: con estas no hay conflicto posible, a
 * diferencia de la CSP.
 */
export const PACKAGE_BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',

  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const

/**
 * CSP del documento de un paquete (contrato-zip-tools-insights.md §12.4).
 * Aislada y sin dominios externos. Las cuatro últimas directivas no heredan
 * de `default-src`, por eso van explícitas: sin ellas la tool se podía
 * enmarcar desde otro sitio (clickjacking) y un formulario inyectado podía
 * enviarse a cualquier URL. `base-uri 'self'` es compatible con el
 * `<base href>` que inyecta el servidor.
 */
export const PACKAGE_DOCUMENT_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';"

/**
 * CSP de un asset que el navegador podría abrir como DOCUMENTO si alguien
 * navega a su URL directa (`.html`, `.htm`, `.svg`): sin scripts, sin
 * recursos y en un origen opaco (`sandbox`). Solo importa cuando se abre como
 * documento; no afecta a un SVG cargado con `<img>` ni como fondo CSS.
 */
export const PACKAGE_ACTIVE_ASSET_CSP = "default-src 'none'; sandbox"

const ACTIVE_ASSET_EXTENSIONS = new Set(['html', 'htm', 'svg'])

/** ¿Puede este fichero ejecutar scripts si se abre por su URL directa? */
export function isActiveAsset(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''

  return ACTIVE_ASSET_EXTENSIONS.has(extension)
}

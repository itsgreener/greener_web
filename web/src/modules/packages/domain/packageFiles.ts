/**
 * Reglas comunes de los ficheros de un paquete HTML (tools/insights):
 * dónde se guardan y con qué Content-Type se suben y se sirven. Antes cada
 * sitio tenía su propio mapa y ya habían empezado a diverger (uno no tenía
 * webp, el otro no tenía html ni mjs).
 */

/** Bucket de Supabase Storage con los paquetes (privado: solo la service role lo lee). */
export const PACKAGE_BUCKET = 'html-packages'

// Tipos con Content-Type propio. Todo lo demás sale como
// application/octet-stream (ver contrato-zip-tools-insights.md §1).
//
// Incluye fuentes WOFF2 e imágenes JPEG/WebP: servidas como octet-stream,
// el navegador descarta una fuente y puede no reconocer una imagen.
const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',

  js: 'text/javascript; charset=utf-8',
  // Un `<script type="module">` solo arranca si el MIME es JavaScript.
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',

  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',

  woff: 'font/woff',
  woff2: 'font/woff2',
}

/**
 * El Content-Type correcto es imprescindible: un worker.js servido con
 * MIME incorrecto no arranca en la mayoría de navegadores, y una fuente
 * WOFF2 servida como octet-stream no se aplica.
 *
 * La extensión se normaliza a minúsculas: un `Coolvetica.WOFF2` subido
 * así (frecuente si el fichero viene de una exportación de diseño) debe
 * comportarse igual que `coolvetica.woff2`.
 */
export function contentTypeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

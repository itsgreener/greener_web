/**
 * Reglas comunes de los ficheros de un paquete HTML (tools/insights):
 * dónde se guardan y con qué Content-Type se suben y se sirven. Antes cada
 * sitio tenía su propio mapa y ya habían empezado a diverger (uno no tenía
 * webp, el otro no tenía html ni mjs).
 */

/** Bucket de Supabase Storage con los paquetes (privado: solo la service role lo lee). */
export const PACKAGE_BUCKET = 'html-packages'

/**
 * Zona de paso de la subida directa de ZIP. El navegador sube el ZIP ahí con
 * una URL firmada (la plataforma limita el cuerpo de una petición a una
 * función a unos 4,5 MB, y un paquete puede pesar hasta 10 MB) y la acción lo
 * lee desde Storage, lo valida y lo borra. Va dentro del mismo bucket y bajo
 * un prefijo que no puede ser un id de contenido (`_incoming`), así que no se
 * mezcla con las versiones (`<contentId>/v<n>`).
 */
export const PACKAGE_STAGING_PREFIX = '_incoming'

export function stagedPackagePath(contentId: string, uploadId: string): string {
  return `${PACKAGE_STAGING_PREFIX}/${contentId}/${uploadId}.zip`
}

const STAGED_PATH_PATTERN = /^_incoming\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.zip$/i

/**
 * ¿Es `path` una subida preparada PARA este contenido? La acción lee la ruta
 * de un campo del formulario, así que sin esta comprobación podría apuntar a
 * cualquier otro fichero del bucket (otra versión, la subida de otro
 * contenido).
 */
export function isStagedPackagePathFor(
  contentId: string,
  path: unknown,
): path is string {
  if (typeof path !== 'string') return false

  const match = STAGED_PATH_PATTERN.exec(path)

  return match !== null && match[1].toLowerCase() === contentId.toLowerCase()
}

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

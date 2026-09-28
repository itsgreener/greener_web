/**
 * Caché de los assets de un paquete (CSS, JS, Worker, imágenes) servidos
 * bajo `/tools|insights/[slug]/app/assets/...`.
 *
 * Problema que resuelve (28 sep): la URL de un asset NO lleva la versión
 * del paquete (`/tools/mi-tool/app/assets/main.js` es la misma en la v1 y
 * en la v2), así que el `Cache-Control: immutable, max-age=1 año` anterior
 * dejaba a los visitantes con el JS/CSS viejo durante un año tras publicar
 * una versión nueva, o tras un rollback. Una caché "para siempre" solo es
 * correcta si la URL cambia cuando cambia el contenido, y aquí no cambia.
 *
 * Solución: revalidación con ETag. El checksum de contenido que ya guarda
 * `html_package_version` (inmutable por versión, ver
 * `zipValidation.computeContentChecksum`) sirve de ETag: si la versión
 * publicada es la misma, el navegador recibe un 304 sin bytes; si es otra
 * (versión nueva o rollback), recibe el asset nuevo en la siguiente carga.
 *
 * Dominio puro: sin Next.js ni Supabase, para poder testearlo aislado.
 */

/**
 * `no-cache` no significa "no cachear": significa "guárdalo, pero
 * revalídalo con el servidor antes de usarlo". Es lo que se quiere aquí.
 */
export const ASSET_CACHE_CONTROL = 'public, no-cache'

export function buildAssetEtag(checksum: string): string {
  return `"${checksum}"`
}

/**
 * Comparación débil de `If-None-Match` (RFC 9110 §13.1.2): ignora el
 * prefijo `W/` y admite una lista de ETags separados por coma o `*`.
 */
export function isNotModified(
  ifNoneMatch: string | null | undefined,
  etag: string,
): boolean {
  if (!ifNoneMatch) {
    return false
  }

  const header = ifNoneMatch.trim()

  if (header === '*') {
    return true
  }

  const normalize = (tag: string) => tag.trim().replace(/^W\//, '')
  const target = normalize(etag)

  return header.split(',').some((tag) => normalize(tag) === target)
}

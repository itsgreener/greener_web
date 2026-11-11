/**
 * Descarga de una versión de un paquete como ZIP desde el ABM.
 *
 * La web NO conserva el ZIP que se sube: lo valida, guarda sus ficheros ya
 * descomprimidos en Storage (`<contenido>/v<n>/…`) y borra el original. Por eso
 * el ZIP que se descarga se RECONSTRUYE con esos ficheros: mismo contenido
 * (mismos `index.html`, `manifest.json` y `assets/`, byte a byte), pero no el
 * mismo archivo: el orden y la compresión pueden diferir de los del ZIP que se
 * subió. Vuelve a pasar la validación de la subida (lo fija un test).
 */

export type PackageVersionFile = {
  /** Ruta dentro del ZIP (`index.html`, `assets/main.js`…), sin el prefijo de Storage. */
  path: string
  data: Buffer
}

export type PackageVersionFiles = {
  /** Slug del contenido, para el nombre del fichero. */
  slug: string
  /** Número de la versión (`v3`), no su identificador. */
  version: number
  files: PackageVersionFile[]
}

/** Lee los ficheros de una versión guardada. */
export interface HtmlPackageVersionReader {
  /**
   * `null` si la versión no existe o no es de ese contenido. Falla (lanza) si
   * Storage no responde: un ZIP con ficheros de menos sería peor que ninguno.
   */
  read(
    contentId: string,
    versionId: string,
  ): Promise<PackageVersionFiles | null>
}

/** Construye un ZIP con esos ficheros. */
export interface PackageZipBuilder {
  build(files: PackageVersionFile[]): Buffer
}

/**
 * Tope del ZIP que se devuelve. La plataforma (Vercel) corta con un error 500
 * cualquier respuesta de una función de más de 4,5 MB, y la subida admite
 * ZIPs de hasta 3,5 MB (`PACKAGE_LIMITS.maxZipSizeBytes`): hay un margen de un
 * MB para que la recompresión no lo pase. Si un ZIP reconstruido lo supera se
 * dice con claridad en vez de dejar que falle la plataforma.
 */
export const MAX_PACKAGE_DOWNLOAD_BYTES = 4_400_000

/**
 * `index.html` y `manifest.json` primero (es lo que se mira al abrir el ZIP) y
 * el resto por ruta: el mismo orden siempre, sin depender de cómo devuelva
 * Storage el listado.
 */
export function orderPackageFiles(
  files: readonly PackageVersionFile[],
): PackageVersionFile[] {
  const rank = (path: string) =>
    path === 'index.html' ? 0 : path === 'manifest.json' ? 1 : 2

  return [...files].sort(
    (a, b) =>
      rank(a.path) - rank(b.path) ||
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  )
}

/**
 * `<slug>-v<n>.zip`. El slug sale de la base de datos, pero va a una cabecera
 * HTTP: solo letras, números, punto, guion y guion bajo.
 */
export function packageDownloadFileName(slug: string, version: number): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')

  return `${safe || 'paquete'}-v${version}.zip`
}

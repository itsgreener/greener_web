import { CV_UPLOAD_PREFIX } from './talentConstants'
import type { CvLocationKind } from './talentAdminModels'

/** Hosts de Google que sirven los ficheros que n8n sube a Drive. */
const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com'])

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value)

    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

/**
 * Ruta de un objeto del bucket `cvs` que el servidor aceptaría firmar: bajo
 * `uploads/`, sin `..` ni barras invertidas. Las rutas viejas pueden llevar
 * espacios o acentos (la web antigua usaba el nombre del fichero), por eso no
 * se exige el formato `uploads/<uuid>.<ext>` de las nuevas.
 */
export function isBucketPath(path: string): boolean {
  if (!path.startsWith(CV_UPLOAD_PREFIX)) return false

  const rest = path.slice(CV_UPLOAD_PREFIX.length)

  return (
    rest.length > 0 &&
    !rest.includes('\\') &&
    !rest.split('/').some((segment) => segment === '..' || segment === '')
  )
}

/**
 * Qué es lo que hay guardado en `candidates.file_path` o `files.path`:
 * - `bucket`: un objeto de `cvs` que n8n aún no ha movido a Drive.
 * - `drive`: un enlace de Drive (el `webViewLink` que escribe n8n).
 * - `external`: cualquier otra cosa con texto (un enlace de otro sitio, o
 *   algo que no es una URL; se enseña pero solo se enlaza si es http/https).
 * - `none`: vacío.
 */
export function classifyCvLocation(
  path: string | null | undefined,
): CvLocationKind {
  const value = path?.trim()

  if (!value) return 'none'

  if (isBucketPath(value)) return 'bucket'

  const url = parseHttpUrl(value)

  if (url && url.protocol === 'https:' && DRIVE_HOSTS.has(url.hostname)) {
    return 'drive'
  }

  return 'external'
}

/** La URL a la que se puede redirigir para un CV que no está en el bucket. */
export function externalCvUrl(path: string | null | undefined): string | null {
  const value = path?.trim()

  if (!value) return null

  return parseHttpUrl(value)?.href ?? null
}

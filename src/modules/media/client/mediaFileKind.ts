import { IMAGE_LIMITS } from '@/modules/media/domain/mediaLimits'
import type { MediaKind } from '@/modules/shared/domain/mediaKind'

import { IMAGE_FILE_ACCEPT } from './validateImageSelection'

/**
 * Qué tipo de medio es un archivo elegido en el ABM, con lo que el navegador
 * sabe de él (tipo MIME y nombre). Es una criba para el selector de archivos,
 * no una validación: el contenido real lo comprueban `validateImageFile` antes
 * de subir y el servidor después.
 */

// MP4, WebM y MOV. Se mira el tipo MIME y, como respaldo, la extensión:
// algunos sistemas no informan del MIME de un .mov.
const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v)$/i

/** `accept` del `<input type="file">` de vídeo (con respaldo por extensión). */
export const VIDEO_FILE_ACCEPT = 'video/*,.mov,.mp4,.webm'

type FileLike = Pick<File, 'name' | 'type'>

export function isVideoFile(file: FileLike): boolean {
  return (
    file.type.toLowerCase().startsWith('video/') ||
    VIDEO_EXTENSION.test(file.name)
  )
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')

  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/**
 * ¿Es una imagen de un formato admitido (JPG, PNG, WebP o AVIF)? Manda el
 * tipo MIME; solo si el sistema no lo informa decide la extensión. Un GIF
 * se queda fuera: no se admiten animaciones.
 */
export function isAllowedImageFile(file: FileLike): boolean {
  const mimeType = file.type.trim().toLowerCase()

  if (mimeType !== '') {
    return (IMAGE_LIMITS.allowedMimeTypes as readonly string[]).includes(
      mimeType,
    )
  }

  return (IMAGE_LIMITS.allowedExtensions as readonly string[]).includes(
    extensionOf(file.name),
  )
}

/** ¿Encaja el archivo en un lote de este tipo? */
export function matchesMediaKind(kind: MediaKind, file: FileLike): boolean {
  return kind === 'video' ? isVideoFile(file) : isAllowedImageFile(file)
}

/** `accept` del `<input type="file">` para un lote de este tipo. */
export function fileAcceptFor(kind: MediaKind): string {
  return kind === 'video' ? VIDEO_FILE_ACCEPT : IMAGE_FILE_ACCEPT
}

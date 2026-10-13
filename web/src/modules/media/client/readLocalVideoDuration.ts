/**
 * Lee en el navegador la duración de un vídeo ANTES de subirlo, para poder
 * rechazar rápido un archivo claramente fuera de límites sin esperar a la
 * subida. Es una lectura best-effort: la fuente de verdad es la duración que
 * devuelve Cloudinary tras subir (los formularios del ABM la validan
 * después).
 *
 * Devuelve `null` —«no se sabe», no se bloquea— cuando el navegador no puede
 * dar una duración fiable:
 *
 * - El archivo no se puede decodificar (típico: `.mov` con HEVC en Chrome o
 *   Firefox): salta `onerror`.
 * - La duración NO es un número finito positivo: un WebM grabado con
 *   MediaRecorder o un grabador de pantalla (el vídeo de demostración típico
 *   de una tool) no lleva la duración en la cabecera y el navegador responde
 *   `Infinity` o `NaN`, que no puede compararse con un límite.
 * - Nunca llega ni `onloadedmetadata` ni `onerror` (algunos códecs): por eso
 *   hay un tiempo máximo, o el formulario se quedaría en «Subiendo…».
 */

export const LOCAL_DURATION_TIMEOUT_MS = 5000

export function readLocalVideoDuration(
  file: File,
  timeoutMs: number = LOCAL_DURATION_TIMEOUT_MS,
): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)

    let settled = false

    const finish = (value: number | null) => {
      if (settled) return
      settled = true

      clearTimeout(timer)
      video.onloadedmetadata = null
      video.onerror = null
      URL.revokeObjectURL(url)

      resolve(value)
    }

    const timer = setTimeout(() => finish(null), timeoutMs)

    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      const duration = video.duration

      finish(Number.isFinite(duration) && duration > 0 ? duration : null)
    }

    video.onerror = () => finish(null)

    video.src = url
  })
}

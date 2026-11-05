import {
  validatePinVideoUpload,
  validateVideoUpload,
  VIDEO_LIMITS,
  pinVideoLimitsFor,
  type MediaValidationError,
} from '@/modules/media/domain/mediaLimits'
import { readLocalVideoDuration } from './readLocalVideoDuration'

/**
 * Comprobaciones de límites de un vídeo antes y después de subirlo a
 * Cloudinary. Las comparten la portada, el carrusel de un caso y los pines
 * (sueltos y en lote): cambia el validador (límites de contenido o de pin) y
 * el texto con el que se explica qué ha pasado con el archivo subido.
 */
export interface VideoRules {
  validate: (
    sizeBytes: number,
    durationSeconds: number,
  ) => MediaValidationError | null
  maxSizeBytes: number
  /** Qué ha pasado con el archivo, entre paréntesis en el mensaje posterior a la subida. */
  discardNote: string
  /** Complemento tras «permitidos» en el mensaje de duración, p. ej. « para un pin». */
  subject?: string
}

const MB = 1024 * 1024

/** Reglas de los vídeos de contenido (portada y carrusel): 100 MB / 180 s. */
export function contentVideoRules(discardNote: string): VideoRules {
  return {
    validate: validateVideoUpload,
    maxSizeBytes: VIDEO_LIMITS.maxSizeBytes,
    discardNote,
  }
}

/** Reglas de los vídeos de pin: dependen del tipo de contenido (tools: 15 s / 15 MB). */
export function pinVideoRules(contentType: string): VideoRules {
  return {
    validate: (sizeBytes, durationSeconds) =>
      validatePinVideoUpload(contentType, sizeBytes, durationSeconds),
    maxSizeBytes: pinVideoLimitsFor(contentType).maxSizeBytes,
    discardNote: 'el archivo subido se ha descartado y no se ha guardado',
    subject: ' para un pin',
  }
}

function isTooLong(
  error: MediaValidationError,
): error is Extract<MediaValidationError, { maxSeconds: number }> {
  return 'maxSeconds' in error
}

/**
 * Antes de subir: lanza si el archivo ya incumple los límites con lo que el
 * navegador sabe. `null` = el navegador no ha podido dar una duración fiable
 * (vídeo no decodificable, .mov/HEVC, WebM sin cabecera…): no se bloquea, se
 * valida solo el tamaño y la duración real se comprueba después con el dato
 * de Cloudinary, que es la fuente de verdad. Ver readLocalVideoDuration.
 */
export async function assertLocalVideoWithinLimits(
  file: File,
  rules: VideoRules,
): Promise<void> {
  const localDuration = await readLocalVideoDuration(file)

  if (localDuration === null) {
    if (file.size > rules.maxSizeBytes) {
      throw new Error(`El vídeo supera los ${rules.maxSizeBytes / MB} MB.`)
    }

    return
  }

  const violation = rules.validate(file.size, localDuration)

  if (!violation) return

  if (isTooLong(violation)) {
    throw new Error(
      `El vídeo no puede superar los ${violation.maxSeconds} segundos.`,
    )
  }

  if (violation.code === 'VIDEO_TOO_LARGE') {
    throw new Error(`El vídeo supera los ${violation.maxBytes / MB} MB.`)
  }
}

/**
 * Después de subir: comprobación definitiva con la duración y el peso que
 * ha calculado Cloudinary. Lanza si el vídeo incumple los límites.
 */
export function assertUploadedVideoWithinLimits(
  uploaded: { bytes: number; duration: number },
  rules: VideoRules,
): void {
  const violation = rules.validate(uploaded.bytes, uploaded.duration)

  if (!violation) return

  if (isTooLong(violation)) {
    throw new Error(
      `El vídeo dura más de los ${violation.maxSeconds} segundos permitidos${rules.subject ?? ''} (${rules.discardNote}).`,
    )
  }

  if (violation.code === 'VIDEO_TOO_LARGE') {
    throw new Error(
      `El vídeo supera los ${violation.maxBytes / MB} MB (${rules.discardNote}).`,
    )
  }
}

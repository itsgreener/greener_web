import { z } from 'zod'

import {
  IMAGE_LIMITS,
  TOOL_PIN_VIDEO_LIMITS,
  VIDEO_LIMITS,
} from './mediaLimits'

/**
 * Campos zod de un medio ya subido a Cloudinary, comunes a todos los
 * schemas que lo registran (portada, carrusel de caso, pin). Cada schema
 * compone los que necesita; lo que difiere de verdad entre ellos (el techo
 * de duración, si `format` es obligatorio) se pasa como parámetro.
 */

export const cloudinaryPublicIdField = z
  .string()
  .trim()
  .min(1, 'Falta el public ID de Cloudinary')

export const mediaDimensionField = z.number().int().positive()

export const imageBytesField = z
  .number()
  .int()
  .positive()
  .max(
    IMAGE_LIMITS.maxSizeBytes,
    `La imagen no puede superar ${IMAGE_LIMITS.maxSizeBytes / 1024 / 1024} MB`,
  )

function videoBytesFieldWithMax(maxBytes: number) {
  return z
    .number()
    .int()
    .positive()
    .max(maxBytes, `El vídeo no puede superar ${maxBytes / 1024 / 1024} MB`)
}

/** Peso de un vídeo de contenido (carrusel de caso): VIDEO_LIMITS. */
export const videoBytesField = videoBytesFieldWithMax(VIDEO_LIMITS.maxSizeBytes)

/**
 * Peso de un vídeo de pin. Techo ABSOLUTO (el de los pines de tool, 15 MB);
 * el de un pin normal es menor (10 MB, PIN_ANIMATION_LIMITS) y lo aplica
 * `attach_pin_video` en SQL, que sí conoce el tipo del contenido.
 */
export const pinVideoBytesField = videoBytesFieldWithMax(
  TOOL_PIN_VIDEO_LIMITS.maxSizeBytes,
)

/** Duración en segundos, redondeada hacia arriba, con un techo propio. */
export function videoDurationField(maxSeconds: number) {
  return z
    .number()
    .positive()
    .max(maxSeconds, `El vídeo no puede superar ${maxSeconds} segundos`)
    .transform((value) => Math.ceil(value))
}

/** Campos de una imagen subida: public id, formato, medidas y peso. */
export const uploadedImageFields = {
  cloudinaryPublicId: cloudinaryPublicIdField,
  format: z.string().trim().min(1, 'Falta el formato de imagen'),
  width: mediaDimensionField,
  height: mediaDimensionField,
  bytes: imageBytesField,
}

/** Campos de un vídeo subido, con el techo de duración de cada contexto. */
export function uploadedVideoFields(maxDurationSeconds: number) {
  return {
    cloudinaryPublicId: cloudinaryPublicIdField,
    format: z.string().trim().min(1, 'Falta el formato del vídeo'),
    width: mediaDimensionField,
    height: mediaDimensionField,
    durationSeconds: videoDurationField(maxDurationSeconds),
    bytes: videoBytesField,
  }
}

import { z } from 'zod'

import { IMAGE_LIMITS, VIDEO_LIMITS } from './mediaLimits'

export const mediaKindSchema = z.enum(['image', 'video'])

export const mediaStatusSchema = z.enum(['processing', 'ready', 'error'])

export const registerImageForBlockSchema = z.object({
  blockId: z.string().uuid('El identificador del bloque no es válido'),

  contentId: z.string().uuid('El identificador del contenido no es válido'),

  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, 'Falta el public ID de Cloudinary'),

  format: z.string().trim().min(1, 'Falta el formato de imagen'),

  width: z.number().int().positive(),

  height: z.number().int().positive(),

  bytes: z
    .number()
    .int()
    .positive()
    .max(
      IMAGE_LIMITS.maxSizeBytes,
      `La imagen no puede superar ${IMAGE_LIMITS.maxSizeBytes / 1024 / 1024} MB`,
    ),
})

export const registerVideoForBlockSchema = z.object({
  blockId: z.string().uuid('El identificador del bloque no es válido'),

  contentId: z.string().uuid('El identificador del contenido no es válido'),

  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, 'Falta el public ID de Cloudinary'),

  format: z.string().trim().min(1, 'Falta el formato del vídeo'),

  width: z.number().int().positive(),

  height: z.number().int().positive(),

  durationSeconds: z
    .number()
    .positive()
    .max(
      VIDEO_LIMITS.maxDurationSeconds,
      `El vídeo no puede superar ${VIDEO_LIMITS.maxDurationSeconds} segundos`,
    )
    .transform((value) => Math.ceil(value)),

  bytes: z
    .number()
    .int()
    .positive()
    .max(
      VIDEO_LIMITS.maxSizeBytes,
      `El vídeo no puede superar ${VIDEO_LIMITS.maxSizeBytes / 1024 / 1024} MB`,
    ),
})

/**
 * Desvincular + borrar el medio de un bloque al sustituirlo (evita medios
 * huérfanos, ver unlink_and_delete_media_asset en Supabase). cloudinaryPublicId
 * y kind viajan aquí porque, una vez borrado el registro en Postgres, son
 * los únicos datos que quedan para poder borrar el archivo real en
 * Cloudinary — el ABM los toma del media_asset que ya tenía cargado antes
 * de empezar la sustitución.
 */
export const deleteBlockMediaSchema = z.object({
  blockId: z.string().uuid('El identificador del bloque no es válido'),

  mediaId: z.string().uuid('El identificador del medio no es válido'),

  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, 'Falta el public ID de Cloudinary'),

  kind: mediaKindSchema,
})

export type MediaKind = z.infer<typeof mediaKindSchema>

export type MediaStatus = z.infer<typeof mediaStatusSchema>

export type RegisterImageForBlockInput = z.infer<
  typeof registerImageForBlockSchema
>

export type RegisterVideoForBlockInput = z.infer<
  typeof registerVideoForBlockSchema
>

export type DeleteBlockMediaInput = z.infer<typeof deleteBlockMediaSchema>

export type MediaAsset = {
  id: string

  kind: MediaKind

  cloudinaryPublicId: string

  format: string | null

  width: number | null

  height: number | null

  durationSeconds: number | null

  bytes: number | null

  status: MediaStatus

  createdAt: string
}

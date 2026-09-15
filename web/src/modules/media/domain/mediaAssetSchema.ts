import { z } from 'zod'

import { IMAGE_LIMITS, VIDEO_LIMITS } from './mediaLimits'

export const mediaKindSchema = z.enum(['image', 'video'])

export const mediaStatusSchema = z.enum(['processing', 'ready', 'error'])

// especificacion-final-formato-detalle.md §3: cover_media_id de
// tool/insight/other. Imagen únicamente para tool/insight; other admite
// imagen o vídeo (nunca ambos) — de ahí dos schemas separados en vez de
// uno con un kind condicional.
export const registerCoverImageSchema = z.object({
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

export const registerCoverVideoSchema = z.object({
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
 * Desvincular + borrar la portada de un contenido al sustituirla (evita
 * medios huérfanos, igual que el editor de bloques antes — ver
 * unlink_and_delete_cover_media en Supabase).
 */
export const deleteCoverMediaSchema = z.object({
  contentId: z.string().uuid('El identificador del contenido no es válido'),

  mediaId: z.string().uuid('El identificador del medio no es válido'),

  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, 'Falta el public ID de Cloudinary'),

  kind: mediaKindSchema,
})

// especificacion-final-formato-detalle.md §3, §6: carrusel de detalle de
// un caso — 1-N imágenes/vídeos mixtos, sin tope (case_detail_media, no
// reutiliza pin_media).
export const addCaseCarouselImageSchema = z.object({
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

  sortOrder: z.number().int().min(0),

  alt: z.string().trim().min(1, 'El alt es obligatorio'),
})

export const addCaseCarouselVideoSchema = z.object({
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

  sortOrder: z.number().int().min(0),

  alt: z.string().trim().min(1, 'El alt es obligatorio'),
})

export const removeCaseCarouselMediaSchema = z.object({
  contentId: z.string().uuid('El identificador del contenido no es válido'),

  mediaId: z.string().uuid('El identificador del medio no es válido'),

  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, 'Falta el public ID de Cloudinary'),

  kind: mediaKindSchema,
})

export type MediaKind = z.infer<typeof mediaKindSchema>

export type MediaStatus = z.infer<typeof mediaStatusSchema>

export type RegisterCoverImageInput = z.infer<typeof registerCoverImageSchema>

export type RegisterCoverVideoInput = z.infer<typeof registerCoverVideoSchema>

export type DeleteCoverMediaInput = z.infer<typeof deleteCoverMediaSchema>

export type AddCaseCarouselImageInput = z.infer<
  typeof addCaseCarouselImageSchema
>

export type AddCaseCarouselVideoInput = z.infer<
  typeof addCaseCarouselVideoSchema
>

export type RemoveCaseCarouselMediaInput = z.infer<
  typeof removeCaseCarouselMediaSchema
>

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

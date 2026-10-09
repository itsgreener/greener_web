import { z } from 'zod'

import { VIDEO_LIMITS } from './mediaLimits'
import {
  cloudinaryPublicIdField,
  uploadedImageFields,
  uploadedVideoFields,
} from './uploadedMediaFields'
import { idSchema } from '@/lib/validation/idSchema'
import {
  mediaKindSchema,
  type MediaKind,
} from '@/modules/shared/domain/mediaKind'
import { pinRatioSchema } from '@/modules/shared/domain/ratio'

export const mediaStatusSchema = z.enum(['processing', 'ready', 'error'])

// especificacion-final-formato-detalle.md §3: cover_media_id de
// tool/insight/other. Imagen únicamente para tool/insight; other admite
// imagen o vídeo (nunca ambos) — de ahí dos schemas separados en vez de
// uno con un kind condicional.
export const registerCoverImageSchema = z.object({
  contentId: idSchema('content'),

  ...uploadedImageFields,

  // especificacion-final-formato-detalle.md §2: gobierna el grupo de
  // columnas del panel de recomendaciones (16:9 / 1:1,4:3 / verticales).
  // El ABM lo sugiere a partir de width/height reales, pero el admin
  // elige siempre uno de los 7 valores cerrados — nunca se deriva ni se
  // guarda en servidor sin confirmación explícita.
  ratio: pinRatioSchema,
})

export const registerCoverVideoSchema = z.object({
  contentId: idSchema('content'),

  ...uploadedVideoFields(VIDEO_LIMITS.maxDurationSeconds),

  ratio: pinRatioSchema,
})

/**
 * Desvincular + borrar la portada de un contenido al sustituirla (evita
 * medios huérfanos, igual que el editor de bloques antes — ver
 * unlink_and_delete_cover_media en Supabase).
 */
export const deleteCoverMediaSchema = z.object({
  contentId: idSchema('content'),

  mediaId: idSchema('media'),

  cloudinaryPublicId: cloudinaryPublicIdField,

  kind: mediaKindSchema,
})

// especificacion-final-formato-detalle.md §3, §6: carrusel de detalle de
// un caso — 1-N imágenes/vídeos mixtos, sin tope (case_detail_media, no
// reutiliza pin_media).
export const addCaseCarouselImageSchema = z.object({
  contentId: idSchema('content'),

  ...uploadedImageFields,

  sortOrder: z.number().int().min(0),

  alt: z.string().trim().min(1, 'El alt es obligatorio'),
})

export const addCaseCarouselVideoSchema = z.object({
  contentId: idSchema('content'),

  ...uploadedVideoFields(VIDEO_LIMITS.maxDurationSeconds),

  sortOrder: z.number().int().min(0),

  alt: z.string().trim().min(1, 'El alt es obligatorio'),
})

export const removeCaseCarouselMediaSchema = z.object({
  contentId: idSchema('content'),

  mediaId: idSchema('media'),

  cloudinaryPublicId: cloudinaryPublicIdField,

  kind: mediaKindSchema,
})

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

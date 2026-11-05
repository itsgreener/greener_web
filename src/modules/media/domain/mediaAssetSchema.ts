import { z } from 'zod'

import { idSchema } from '@/lib/validation/idSchema'
import { mediaKindSchema } from '@/modules/shared/domain/mediaKind'
import { VIDEO_LIMITS } from './mediaLimits'
import {
  cloudinaryPublicIdField,
  uploadedImageFields,
  uploadedVideoFields,
} from './uploadedMediaFields'

export const mediaStatusSchema = z.enum(['processing', 'ready', 'error'])

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

export type AddCaseCarouselImageInput = z.infer<
  typeof addCaseCarouselImageSchema
>

export type AddCaseCarouselVideoInput = z.infer<
  typeof addCaseCarouselVideoSchema
>

export type RemoveCaseCarouselMediaInput = z.infer<
  typeof removeCaseCarouselMediaSchema
>

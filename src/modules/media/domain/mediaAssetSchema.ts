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

// Edición de una diapositiva ya subida (plan-carrusel-orden-y-edicion.md).
//
// `mediaId` es el medio que hay AHORA en la diapositiva: identifica la fila.
// A propósito no se pide su public id ni su tipo: el archivo viejo que se
// borra de Cloudinary se lee de la base de datos, nunca del navegador.

const carouselAltField = z.string().trim().min(1, 'El alt es obligatorio')

export const updateCaseCarouselAltSchema = z.object({
  contentId: idSchema('content'),

  mediaId: idSchema('media'),

  alt: carouselAltField,
})

export const replaceCaseCarouselImageSchema = z.object({
  contentId: idSchema('content'),

  mediaId: idSchema('media'),

  ...uploadedImageFields,

  alt: carouselAltField,
})

export const replaceCaseCarouselVideoSchema = z.object({
  contentId: idSchema('content'),

  mediaId: idSchema('media'),

  ...uploadedVideoFields(VIDEO_LIMITS.maxDurationSeconds),

  alt: carouselAltField,
})

/** Máximo de ids por petición de orden: cota de sensatez, el carrusel no tiene tope propio. */
export const MAX_CAROUSEL_REORDER_IDS = 500

// La lista completa de medios del carrusel, en el orden nuevo. Postgres
// comprueba que coincide EXACTAMENTE con lo que hay (y sin repetidos).
export const reorderCaseCarouselSchema = z.object({
  contentId: idSchema('content'),

  mediaIds: z
    .array(idSchema('media'))
    .min(1, 'No hay diapositivas que ordenar')
    .max(MAX_CAROUSEL_REORDER_IDS),
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

export type UpdateCaseCarouselAltInput = z.infer<
  typeof updateCaseCarouselAltSchema
>

export type ReplaceCaseCarouselImageInput = z.infer<
  typeof replaceCaseCarouselImageSchema
>

export type ReplaceCaseCarouselVideoInput = z.infer<
  typeof replaceCaseCarouselVideoSchema
>

export type ReorderCaseCarouselInput = z.infer<typeof reorderCaseCarouselSchema>

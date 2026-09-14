import { z } from 'zod'

import {
  IMAGE_LIMITS,
  VIDEO_LIMITS,
  PIN_ANIMATION_LIMITS,
} from '@/modules/media/domain/mediaLimits'

// Antes había un slideOrder distinto según pin_type (0-7 para carrusel,
// siempre 0 para fixed/animated). Ese enum desaparece: cualquier pin
// admite hasta 8 medios mixtos, así que el rango 0-7 aplica siempre.
export const attachPinImageSchema = z.object({
  pinId: z.string().uuid('El identificador del pin no es válido'),

  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, 'Falta el public ID de Cloudinary'),

  format: z.string().trim().optional(),

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

  slideOrder: z.number().int().min(0).max(7),
})

export const attachPinVideoSchema = z.object({
  pinId: z.string().uuid('El identificador del pin no es válido'),

  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, 'Falta el public ID de Cloudinary'),

  format: z.string().trim().optional(),

  width: z.number().int().positive(),

  height: z.number().int().positive(),

  durationSeconds: z
    .number()
    .positive()
    .max(
      PIN_ANIMATION_LIMITS.maxDurationSeconds,
      `La animación no puede superar ${PIN_ANIMATION_LIMITS.maxDurationSeconds} segundos`,
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

  slideOrder: z.number().int().min(0).max(7),
})

export const detachPinMediaSchema = z.object({
  pinId: z.string().uuid('El identificador del pin no es válido'),

  mediaId: z.string().uuid('El identificador del medio no es válido'),

  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, 'Falta el public ID de Cloudinary'),

  kind: z.enum(['image', 'video']),
})

export type AttachPinImageInput = z.infer<typeof attachPinImageSchema>
export type AttachPinVideoInput = z.infer<typeof attachPinVideoSchema>
export type DetachPinMediaInput = z.infer<typeof detachPinMediaSchema>

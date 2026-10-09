import { z } from 'zod'

import { idSchema } from '@/lib/validation/idSchema'
import { TOOL_PIN_VIDEO_LIMITS } from '@/modules/media/domain/mediaLimits'
import {
  cloudinaryPublicIdField,
  imageBytesField,
  mediaDimensionField,
  videoBytesField,
  videoDurationField,
} from '@/modules/media/domain/uploadedMediaFields'
import { mediaKindSchema } from '@/modules/shared/domain/mediaKind'

// Un pin es un único medio (7 oct 2026, §2.41): ya no hay slideOrder.
// La base de datos lo rellena con 0.
export const attachPinImageSchema = z.object({
  pinId: idSchema('pin'),

  cloudinaryPublicId: cloudinaryPublicIdField,

  format: z.string().trim().optional(),

  width: mediaDimensionField,

  height: mediaDimensionField,

  bytes: imageBytesField,
})

export const attachPinVideoSchema = z.object({
  pinId: idSchema('pin'),

  cloudinaryPublicId: cloudinaryPublicIdField,

  format: z.string().trim().optional(),

  width: mediaDimensionField,

  height: mediaDimensionField,

  // Techo ABSOLUTO (el de los pines de tools). El límite real depende del
  // tipo de contenido del pin (8 s en el resto, ver pinVideoLimitsFor) y lo
  // aplica `attach_pin_video` en SQL, que sí conoce el pin; el ABM avisa
  // antes de subir con validatePinVideoUpload.
  durationSeconds: videoDurationField(TOOL_PIN_VIDEO_LIMITS.maxDurationSeconds),

  bytes: videoBytesField,
})

export const detachPinMediaSchema = z.object({
  pinId: idSchema('pin'),

  mediaId: idSchema('media'),

  cloudinaryPublicId: cloudinaryPublicIdField,

  kind: mediaKindSchema,
})

export type AttachPinImageInput = z.infer<typeof attachPinImageSchema>
export type AttachPinVideoInput = z.infer<typeof attachPinVideoSchema>
export type DetachPinMediaInput = z.infer<typeof detachPinMediaSchema>

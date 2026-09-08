import { z } from 'zod'

export const pinTypeSchema = z.enum(['fixed', 'animated', 'carousel'])

export const pinRatioSchema = z.enum([
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '9:16',
  '16:9',
])

export const pinLocaleSchema = z.enum(['es', 'en', 'ca'])

export const pinAutoplayModeSchema = z.enum(['viewport', 'hover'])

const pinCommonFields = {
  ratio: pinRatioSchema,

  label: z.string().trim().min(1, 'El rótulo es obligatorio'),

  cta: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),

  language: pinLocaleSchema,

  autoplayMode: pinAutoplayModeSchema.nullable().optional(),

  speedMs: z.coerce.number().int().positive().nullable().optional(),

  queueOrder: z.coerce
    .number()
    .int()
    .min(0, 'queue_order no puede ser negativo'),

  alt: z.string().trim().min(1, 'El alt es obligatorio'),
}

export const createPinSchema = z.object({
  contentId: z.string().uuid('El identificador del contenido no es válido'),

  type: pinTypeSchema,

  ...pinCommonFields,
})

export const updatePinSchema = z.object({
  id: z.string().uuid('El identificador del pin no es válido'),

  ...pinCommonFields,
})

export const deletePinSchema = z.object({
  id: z.string().uuid('El identificador del pin no es válido'),
})

export type PinType = z.infer<typeof pinTypeSchema>
export type CreatePinInput = z.infer<typeof createPinSchema>
export type UpdatePinInput = z.infer<typeof updatePinSchema>
export type DeletePinInput = z.infer<typeof deletePinSchema>

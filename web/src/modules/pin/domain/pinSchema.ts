import { z } from 'zod'

import { localeSchema } from '@/modules/shared/domain/locale'
import { pinRatioSchema } from '@/modules/shared/domain/ratio'
import { idSchema } from '@/lib/validation/idSchema'

export const pinAutoplayModeSchema = z.enum(['viewport', 'hover'])

const pinCommonFields = {
  ratio: pinRatioSchema,

  // §3 "Pin (todos los tipos)": obligatorio en tool/insight/libre,
  // opcional (no se muestra) en caso/episodio — esa condición depende
  // del tipo de contenido, así que aquí solo se valida la forma (texto
  // o null); la obligatoriedad según el tipo la aplica la función SQL
  // (create_pin/update_pin), que sí conoce content.type.
  label: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),

  language: localeSchema,

  autoplayMode: pinAutoplayModeSchema.nullable().optional(),

  alt: z.string().trim().min(1, 'El alt es obligatorio'),
}

export const createPinSchema = z.object({
  contentId: idSchema('content'),

  ...pinCommonFields,
})

export const updatePinSchema = z.object({
  id: idSchema('pin'),

  ...pinCommonFields,
})

export const deletePinSchema = z.object({
  id: idSchema('pin'),
})

export type CreatePinInput = z.infer<typeof createPinSchema>
export type UpdatePinInput = z.infer<typeof updatePinSchema>
export type DeletePinInput = z.infer<typeof deletePinSchema>

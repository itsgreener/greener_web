import { z } from 'zod'

// especificacion-final-formato-detalle.md §4: lista cerrada de 7 ratios
// (antes 6 — faltaba 4:3, que agrupa junto a 1:1 en el modelo de
// columnas del §2).
export const pinRatioSchema = z.enum([
  '1:1',
  '4:3',
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

  language: pinLocaleSchema,

  autoplayMode: pinAutoplayModeSchema.nullable().optional(),

  alt: z.string().trim().min(1, 'El alt es obligatorio'),
}

export const createPinSchema = z.object({
  contentId: z.string().uuid('El identificador del contenido no es válido'),

  ...pinCommonFields,
})

export const updatePinSchema = z.object({
  id: z.string().uuid('El identificador del pin no es válido'),

  ...pinCommonFields,
})

export const deletePinSchema = z.object({
  id: z.string().uuid('El identificador del pin no es válido'),
})

export type CreatePinInput = z.infer<typeof createPinSchema>
export type UpdatePinInput = z.infer<typeof updatePinSchema>
export type DeletePinInput = z.infer<typeof deletePinSchema>

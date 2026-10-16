import { z } from 'zod'

import { idSchema } from '@/lib/validation/idSchema'
import { createContentSchema } from '@/modules/content/domain/contentSchema'

/**
 * ABM de los contenidos `other` (plan de other, §3 y §7). Tienen dos
 * subtipos, que se eligen al crear y no cambian (lo impide la base de datos):
 *
 * - `newsletter`: pin formulario dentro del feed, sin destino ni ficha.
 * - `page`: página satélite servida como paquete HTML en `/variety/{slug}/app`.
 *
 * Cada `other` lleva su propia frecuencia: «una aparición cada N pines».
 */
export const OTHER_KINDS = ['newsletter', 'page'] as const

export const otherKindSchema = z.enum(OTHER_KINDS, {
  error: 'Elige el tipo de Other: newsletter o página satélite',
})

export type OtherKind = z.infer<typeof otherKindSchema>

export function otherKindLabel(kind: OtherKind): string {
  return kind === 'newsletter' ? 'Newsletter' : 'Página satélite'
}

/** Mismo mínimo que `check (frequency >= 25)` en `other_detail`. */
export const OTHER_MIN_FREQUENCY = 25

export const OTHER_DEFAULT_FREQUENCY = 100

/** A partir de este porcentaje de ocupación estimada se avisa (no bloquea). */
export const OTHER_OCCUPANCY_WARNING_PERCENT = 10

/**
 * Ocupación estimada del feed por los `other`: la suma de `100 / N` de cada
 * uno (un `other` cada N pines ocupa el 100/N % de la ronda). Es una cota
 * ligeramente alta: la separación mínima y el tope de retraso del calendario
 * omiten alguna repetición. Ignora frecuencias no válidas.
 */
export function estimateOtherOccupation(
  frequencies: readonly number[],
): number {
  return frequencies.reduce(
    (total, frequency) =>
      Number.isFinite(frequency) && frequency > 0
        ? total + 100 / frequency
        : total,
    0,
  )
}

export function isOtherOccupationHigh(percent: number): boolean {
  return percent > OTHER_OCCUPANCY_WARNING_PERCENT
}

export const otherFrequencySchema = z
  .number({ error: 'La frecuencia debe ser un número' })
  .int('La frecuencia debe ser un número entero')
  .min(
    OTHER_MIN_FREQUENCY,
    `La frecuencia mínima es una aparición cada ${OTHER_MIN_FREQUENCY} pines`,
  )

export const createOtherSchema = createContentSchema
  .omit({ type: true })
  .extend({
    kind: otherKindSchema,

    frequency: otherFrequencySchema,
  })

export const updateOtherFrequencySchema = z.object({
  contentId: idSchema('content'),

  frequency: otherFrequencySchema,
})

export type OtherDetail = {
  contentId: string

  kind: OtherKind

  frequency: number
}

export type CreateOtherInput = z.infer<typeof createOtherSchema>

export type UpdateOtherFrequencyInput = z.infer<
  typeof updateOtherFrequencySchema
>

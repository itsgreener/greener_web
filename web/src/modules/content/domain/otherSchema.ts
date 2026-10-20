import { z } from 'zod'

import { idSchema } from '@/lib/validation/idSchema'
import { createContentSchema } from '@/modules/content/domain/contentSchema'
import { isReservedRootSegment } from '@/modules/content/domain/reservedSlugs'

/**
 * ABM de los contenidos `other` (plan de other, §3 y §7). Tienen dos
 * subtipos, que se eligen al crear y no cambian (lo impide la base de datos):
 *
 * - `newsletter`: pin formulario dentro del feed, sin destino ni ficha.
 * - `page`: página satélite servida como paquete HTML en `/variety/{slug}/app`.
 *
 * Cada `other` lleva su propia frecuencia: «una aparición cada N pines».
 */
const OTHER_KINDS = ['newsletter', 'page'] as const

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

/**
 * Una newsletter no tiene página ni URL: su slug solo existe porque la tabla
 * `content` lo exige, y su título es el titular de la tarjeta, que se escribe
 * después en el editor. Por eso el alta no los pide y se rellenan con estos
 * valores (el slug lleva un sufijo aleatorio para no chocar con otro). Slug
 * e idioma siguen siendo editables en «Datos generales» del editor.
 */
export const NEWSLETTER_DEFAULT_TITLE = 'Newsletter'

export const NEWSLETTER_DEFAULT_LOCALE = 'es'

export function newsletterDraftDefaults(suffix: string): {
  slug: string

  defaultLocale: string

  title: string
} {
  return {
    slug: `newsletter-${suffix}`,

    defaultLocale: NEWSLETTER_DEFAULT_LOCALE,

    title: NEWSLETTER_DEFAULT_TITLE,
  }
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
  .superRefine((value, ctx) => {
    // Solo las páginas tienen URL (`/{slug}` redirige a `/variety/{slug}/app`).
    if (value.kind === 'page' && isReservedRootSegment(value.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: 'Ese slug está reservado por la web. Elige otro',
      })
    }
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

import { z } from 'zod'

/**
 * especificacion-final-formato-detalle.md §3, §6: template_variant,
 * sector, services, year, credits y links desaparecen — "no tienen
 * cabida en el nuevo diseño, no se arrastran como campos muertos". El
 * formato de detalle se infiere siempre de content.type, nunca se
 * elige. Solo quedan force (rotación de pines por tanda, brief §4.3) y
 * client (texto libre no traducible).
 */
export const caseDetailSchema = z.object({
  contentId: z.string().uuid('El identificador del contenido no es válido'),

  force: z
    .number()
    .int()
    .min(1, 'Force debe ser como mínimo 1')
    .max(5, 'Force debe ser como máximo 5'),

  client: z.string().trim().nullable(),
})

export type CaseDetail = z.infer<typeof caseDetailSchema>

export type UpsertCaseDetailInput = CaseDetail

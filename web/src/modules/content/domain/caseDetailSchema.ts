import { z } from 'zod'

export const caseTemplateVariantSchema =
  z.enum([
    'A',
    'B',
    'C',
  ])

export const caseDetailSchema = z.object({
  contentId: z
    .string()
    .uuid(
      'El identificador del contenido no es válido'
    ),

  templateVariant:
    caseTemplateVariantSchema,

  force: z
    .number()
    .int()
    .min(
      1,
      'Force debe ser como mínimo 1'
    )
    .max(
      5,
      'Force debe ser como máximo 5'
    ),

  client: z
    .string()
    .trim()
    .nullable(),

  sector: z
    .string()
    .trim()
    .nullable(),

  services: z
    .string()
    .trim()
    .nullable(),

  year: z
    .number()
    .int()
    .nullable(),

  credits: z.array(
    z.unknown()
  ),

  links: z.array(
    z.unknown()
  ),
})

export type CaseTemplateVariant =
  z.infer<
    typeof caseTemplateVariantSchema
  >

export type CaseDetail =
  z.infer<
    typeof caseDetailSchema
  >

export type UpsertCaseDetailInput =
  CaseDetail
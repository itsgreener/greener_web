import { z } from 'zod'

import { localeSchema } from '@/modules/shared/domain/locale'
import { idSchema } from '@/lib/validation/idSchema'
export const contentTranslationSchema = z.object({
  contentId: idSchema('content'),

  locale: localeSchema,

  title: z.string().trim().min(1, 'El título es obligatorio'),

  seoTitle: z.string().trim().nullable(),

  seoDescription: z.string().trim().nullable(),

  summary: z.string().trim().nullable(),

  // especificacion-final-formato-detalle.md §3: campos propios del
  // formato de detalle tipo B (caso/episodio) — subtítulo/cita
  // destacada y cuerpo de texto. Null para el resto de tipos.
  highlight: z.string().trim().nullable(),

  body: z.string().trim().nullable(),
})

export type ContentTranslation = z.infer<typeof contentTranslationSchema>

export type UpsertContentTranslationInput = ContentTranslation

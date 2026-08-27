import { z } from 'zod'

import {
  localeSchema,
} from './contentSchema'

export const contentTranslationSchema =
  z.object({
    contentId: z
      .string()
      .uuid(
        'El identificador del contenido no es válido'
      ),

    locale:
      localeSchema,

    title: z
      .string()
      .trim()
      .min(
        1,
        'El título es obligatorio'
      ),

    seoTitle: z
      .string()
      .trim()
      .nullable(),

    seoDescription: z
      .string()
      .trim()
      .nullable(),

    summary: z
      .string()
      .trim()
      .nullable(),
  })

export type ContentTranslation =
  z.infer<
    typeof contentTranslationSchema
  >

export type UpsertContentTranslationInput =
  ContentTranslation
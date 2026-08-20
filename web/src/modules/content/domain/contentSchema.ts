import { z } from 'zod'

export const contentTypeSchema = z.enum([
  'case',
  'insight',
  'tool',
  'episode',
  'page',
])

export const localeSchema = z.enum([
  'es',
  'en',
  'ca',
])

export const createContentSchema = z.object({
  type: contentTypeSchema,

  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Usa minúsculas, números y guiones'
    ),

  defaultLocale: localeSchema,

  title: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio'),
})

export type ContentType =
  z.infer<typeof contentTypeSchema>

export type Locale =
  z.infer<typeof localeSchema>

export type CreateContentInput =
  z.infer<typeof createContentSchema>
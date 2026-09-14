import { z } from 'zod'

export const contentTypeSchema = z.enum([
  'case',
  'insight',
  'tool',
  'episode',
  'other',
])

export const localeSchema = z.enum(['es', 'en', 'ca'])

export const createContentSchema = z.object({
  type: contentTypeSchema,

  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones'),

  defaultLocale: localeSchema,

  title: z.string().trim().min(1, 'El título es obligatorio'),
})

export const updateContentSchema = z.object({
  id: z.string().uuid('El identificador del contenido no es válido'),

  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones'),

  defaultLocale: localeSchema,
})

export const deleteContentSchema = z.object({
  id: z.string().uuid('El identificador del contenido no es válido'),
})

export const publishContentSchema = z.object({
  id: z.string().uuid('El identificador del contenido no es válido'),
})

export const scheduleContentSchema = z.object({
  id: z.string().uuid('El identificador del contenido no es válido'),

  publishAt: z.coerce
    .date()
    .refine(
      (date) => date.getTime() > Date.now(),
      'La fecha de publicación debe ser futura',
    ),
})

export const unpublishContentSchema = z.object({
  id: z.string().uuid('El identificador del contenido no es válido'),
})

export type ContentType = z.infer<typeof contentTypeSchema>

export type Locale = z.infer<typeof localeSchema>

export type CreateContentInput = z.infer<typeof createContentSchema>

export type UpdateContentInput = z.infer<typeof updateContentSchema>

export type DeleteContentInput = z.infer<typeof deleteContentSchema>

export type PublishContentInput = z.infer<typeof publishContentSchema>

export type ScheduleContentInput = z.infer<typeof scheduleContentSchema>

export type UnpublishContentInput = z.infer<typeof unpublishContentSchema>

import { z } from 'zod'

import { contentTypeSchema } from '@/modules/shared/domain/contentType'
import { localeSchema } from '@/modules/shared/domain/locale'
import { idSchema } from '@/lib/validation/idSchema'

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
  id: idSchema('content'),

  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones'),

  defaultLocale: localeSchema,
})

export const deleteContentSchema = z.object({
  id: idSchema('content'),
})

export const publishContentSchema = z.object({
  id: idSchema('content'),
})

export const scheduleContentSchema = z.object({
  id: idSchema('content'),

  publishAt: z.coerce
    .date()
    .refine(
      (date) => date.getTime() > Date.now(),
      'La fecha de publicación debe ser futura',
    ),
})

export const unpublishContentSchema = z.object({
  id: idSchema('content'),
})

export type CreateContentInput = z.infer<typeof createContentSchema>

export type UpdateContentInput = z.infer<typeof updateContentSchema>

export type DeleteContentInput = z.infer<typeof deleteContentSchema>

export type PublishContentInput = z.infer<typeof publishContentSchema>

export type ScheduleContentInput = z.infer<typeof scheduleContentSchema>

export type UnpublishContentInput = z.infer<typeof unpublishContentSchema>

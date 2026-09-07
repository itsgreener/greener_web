import { z } from 'zod'

import { localeSchema } from './contentSchema'

export const contentBlockTypeSchema = z.enum([
  'rich_text',
  'image',
  'carousel',
  'video',
  'quote',
  'links_credits',
])

export const contentBlockConfigSchema = z.record(z.string(), z.unknown())

export const createContentBlockSchema = z.object({
  contentId: z.string().uuid('El identificador del contenido no es válido'),

  type: contentBlockTypeSchema,

  sortOrder: z.number().int().min(0, 'El orden no puede ser negativo'),

  config: contentBlockConfigSchema,
})

export const updateContentBlockSchema = z.object({
  id: z.string().uuid('El identificador del bloque no es válido'),

  sortOrder: z.number().int().min(0, 'El orden no puede ser negativo'),

  config: contentBlockConfigSchema,
})

export const deleteContentBlockSchema = z.object({
  id: z.string().uuid('El identificador del bloque no es válido'),
})

export const contentBlockTranslationSchema = z.object({
  blockId: z.string().uuid('El identificador del bloque no es válido'),

  locale: localeSchema,

  bodyRichText: z.string().trim().nullable(),

  caption: z.string().trim().nullable(),

  quoteText: z.string().trim().nullable(),
})

export type ContentBlockType = z.infer<typeof contentBlockTypeSchema>

export type ContentBlockConfig = z.infer<typeof contentBlockConfigSchema>

export type CreateContentBlockInput = z.infer<typeof createContentBlockSchema>

export type UpdateContentBlockInput = z.infer<typeof updateContentBlockSchema>

export type DeleteContentBlockInput = z.infer<typeof deleteContentBlockSchema>

export type ContentBlockTranslation = z.infer<
  typeof contentBlockTranslationSchema
>

export type UpsertContentBlockTranslationInput = ContentBlockTranslation

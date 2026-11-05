import { z } from 'zod'

/** Tipos de contenido. Mismo conjunto que el enum `content_type` de Postgres. */
export const contentTypeSchema = z.enum([
  'case',
  'insight',
  'tool',
  'episode',
  'other',
])

export type ContentType = z.infer<typeof contentTypeSchema>

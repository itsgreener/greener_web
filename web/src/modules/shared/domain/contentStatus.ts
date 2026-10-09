import { z } from 'zod'

/** Estado de un contenido. Mismo conjunto que el enum `content_status` de Postgres. */
export const contentStatusSchema = z.enum(['draft', 'scheduled', 'published'])

export type ContentStatus = z.infer<typeof contentStatusSchema>

import { z } from 'zod'

/** Idiomas de un contenido. Mismo conjunto que el enum `locale` de Postgres. */
export const localeSchema = z.enum(['es', 'en', 'ca'])

export type Locale = z.infer<typeof localeSchema>

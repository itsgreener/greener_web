import { z } from 'zod'

/** Tipo de un medio. Mismo conjunto que el enum `media_kind` de Postgres. */
export const mediaKindSchema = z.enum(['image', 'video'])

export type MediaKind = z.infer<typeof mediaKindSchema>

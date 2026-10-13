import { z } from 'zod'

import { localeSchema } from '@/modules/shared/domain/locale'
import { idSchema } from '@/lib/validation/idSchema'
/**
 * ABM de episodios (arquitectura §7.3; nunca había existido — PROGRESO.md
 * §5.5). Un episodio no se traduce (§7.4: "un solo idioma, como el
 * pin") — de ahí `language`, no `content_translation`.
 */
export const episodeProgramSchema = z.enum([
  'brand_the_future',
  'brand_into_europe',
  'brand_to_table',
])

// Vimeo se retiró el 13 oct 2026 (su reproductor bloqueaba la reproducción por
// un script de Cloudflare dentro de su iframe y ningún contenido dependía de
// él). El valor `vimeo` sigue en el enum de Postgres `episode_provider`, que
// no admite quitar valores sin recrear el tipo y las funciones que lo usan;
// aquí no se acepta ni se escribe.
export const episodeProviderSchema = z.enum(['youtube', 'spotify'])

// Enum ampliable (migración del 10 sep): arranca con un único valor real,
// no es un descuido dejarlo tan corto.
export const episodeKindSchema = z.enum(['podcast'])

export type EpisodeProvider = z.infer<typeof episodeProviderSchema>

export const episodeSchema = z.object({
  contentId: idSchema('content'),

  program: episodeProgramSchema,

  number: z.number().int().positive().nullable(),

  guest: z.string().trim().nullable(),

  role: z.string().trim().nullable(),

  company: z.string().trim().nullable(),

  episodeDate: z.iso.date('La fecha no es válida').nullable(),

  durationSeconds: z.number().int().positive().nullable(),

  provider: episodeProviderSchema,

  embedId: z
    .string()
    .trim()
    .min(1, 'El identificador del embed es obligatorio'),

  language: localeSchema,

  episodeKind: episodeKindSchema,
})

export type Episode = z.infer<typeof episodeSchema>

export type UpsertEpisodeInput = Episode

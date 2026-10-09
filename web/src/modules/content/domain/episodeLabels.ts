import type { z } from 'zod'

import type { episodeKindSchema, episodeProgramSchema } from './episodeSchema'

/**
 * Textos legibles de los enums de un episodio. Única fuente: los usan el
 * desplegable «Programa» del ABM, la ficha pública del episodio y el pin
 * del feed (antes estaban duplicados o ni existían fuera del ABM).
 */
export type EpisodeProgram = z.infer<typeof episodeProgramSchema>
export type EpisodeKind = z.infer<typeof episodeKindSchema>

export const EPISODE_PROGRAM_LABEL: Record<EpisodeProgram, string> = {
  brand_the_future: 'Brand the Future',
  brand_into_europe: 'Brand into Europe',
  brand_to_table: 'Brand to Table',
}

export const EPISODE_KIND_LABEL: Record<EpisodeKind, string> = {
  podcast: 'Podcast',
}

export function episodeProgramLabel(
  program: string | null | undefined,
): string {
  if (!program) return ''
  return (EPISODE_PROGRAM_LABEL as Record<string, string>)[program] ?? program
}

export function episodeKindLabel(kind: string | null | undefined): string {
  if (!kind) return ''
  return (EPISODE_KIND_LABEL as Record<string, string>)[kind] ?? kind
}

/**
 * Segunda línea (en negrita) del pin de un episodio en el feed:
 * «<programa> <tipo>», p. ej. «Brand the Future Podcast». Si falta uno de
 * los dos, sale solo el otro; si faltan ambos, no hay segunda línea.
 */
export function episodePinSecondaryText(
  program: string | null | undefined,
  kind: string | null | undefined,
): string | null {
  const text = [episodeProgramLabel(program), episodeKindLabel(kind)]
    .filter(Boolean)
    .join(' ')

  return text || null
}

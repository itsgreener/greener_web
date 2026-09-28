import type { SupabaseClient } from '@supabase/supabase-js'

import {
  createPublicReadClient,
} from '@/lib/supabase/publicReadClient'

export type PublicEpisodeProgram =
  | 'brand_the_future'
  | 'brand_into_europe'
  | 'brand_to_table'

/**
 * Datos públicos necesarios para renderizar un episodio y registrar
 * el evento de analítica "Episode Play" (arquitectura §18.2).
 *
 * `program` ya existe en la tabla episode; simplemente no se estaba
 * leyendo porque hasta ahora la plantilla de detalle no lo necesitaba.
 */
export interface PublicEpisode {
  program: PublicEpisodeProgram
  provider:
    | 'youtube'
    | 'vimeo'
    | 'spotify'
  embedId: string
  episodeKind: 'podcast'
}

export async function getPublicEpisode(
  contentId: string,
  client: SupabaseClient =
    createPublicReadClient(),
): Promise<PublicEpisode | null> {
  const {
    data,
    error,
  } = await client
    .from('episode')
    .select(
      'program, provider, embed_id, episode_kind',
    )
    .eq(
      'content_id',
      contentId,
    )
    .maybeSingle()

  if (error) {
    throw new Error(
      `No se pudo leer el episodio: ${error.message}`,
    )
  }

  if (!data) {
    return null
  }

  return {
    program:
      data.program as PublicEpisodeProgram,

    provider:
      data.provider,

    embedId:
      data.embed_id,

    episodeKind:
      data.episode_kind,
  }
}
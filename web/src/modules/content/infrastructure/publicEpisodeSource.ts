import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'

/**
 * Lectura pública de un episodio para /work/[slug] (tipo B, unificado con
 * caso — especificacion-final-formato-detalle.md §7). No existe ningún
 * repositorio de episode para el ABM todavía (nunca se construyó, ver
 * PROGRESO.md) — este es el primer código que lee esta tabla, y a
 * propósito solo trae lo que necesita la plantilla de detalle nueva:
 * el vídeo embebido (provider + embedId), episodeKind (el equivalente a
 * "client" en un caso, §3) y program, que se añadió el 29 de septiembre
 * porque lo necesita el evento de analítica "Episode Play" (§18.2).
 * number/guest/role/company/duration siguen existiendo en la tabla (para
 * el futuro listado de Channel, brief §5.4) pero no forman parte del
 * formato de detalle rediseñado, así que no se leen aquí.
 */

export type PublicEpisodeProgram =
  'brand_the_future' | 'brand_into_europe' | 'brand_to_table'

export interface PublicEpisode {
  program: PublicEpisodeProgram
  provider: 'youtube' | 'vimeo' | 'spotify'
  embedId: string
  episodeKind: 'podcast'
}

export async function getPublicEpisode(
  contentId: string,
  client: SupabaseClient = createPublicReadClient(),
): Promise<PublicEpisode | null> {
  const { data, error } = await client
    .from('episode')
    .select('program, provider, embed_id, episode_kind')
    .eq('content_id', contentId)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo leer el episodio: ${error.message}`)
  }

  if (!data) return null

  return {
    program: data.program,
    provider: data.provider,
    embedId: data.embed_id,
    episodeKind: data.episode_kind,
  }
}

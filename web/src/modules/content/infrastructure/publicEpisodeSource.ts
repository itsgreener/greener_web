import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type { PublicEpisode } from '@/modules/content/domain/publicContent'

/**
 * Lectura pública de un episodio para /work/[slug] (tipo B, unificado con
 * caso — especificacion-final-formato-detalle.md §7). Solo trae lo que
 * pinta la plantilla de detalle: el vídeo embebido (provider + embedId),
 * episodeKind (el equivalente a «client» en un caso, §3) y program (lo
 * necesita el evento «Episode Play», §18.2). number/guest/role/company/
 * duration existen en la tabla pero no forman parte del detalle.
 */

export async function getPublicEpisode(
  contentId: string,
  client: AppSupabaseClient = createPublicReadClient(),
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

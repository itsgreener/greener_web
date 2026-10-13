import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import { episodeProviderSchema } from '@/modules/content/domain/episodeSchema'
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

  // El enum de la BBDD aún tiene `vimeo` (retirado el 13 oct 2026). Una fila
  // antigua con ese proveedor no se puede embeber: se trata como episodio sin
  // reproductor y la página responde 404 en vez de romperse.
  const provider = episodeProviderSchema.safeParse(data.provider)
  if (!provider.success) return null

  return {
    program: data.program,
    provider: provider.data,
    embedId: data.embed_id,
    episodeKind: data.episode_kind,
  }
}

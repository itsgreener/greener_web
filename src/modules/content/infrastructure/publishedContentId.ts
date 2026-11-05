import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type { ContentType } from '@/modules/shared/domain/contentType'

/**
 * Id real de un contenido publicado a partir de su tipo y slug. Lo usa la
 * analítica para no fiarse de ningún id que mande el navegador.
 *
 * @throws si la lectura falla (null solo significa «no existe / no está publicado»)
 */
export async function getPublishedContentId(
  type: ContentType,
  slug: string,
  client: AppSupabaseClient = createPublicReadClient(),
): Promise<string | null> {
  const { data, error } = await client
    .from('content')
    .select('id')
    .eq('type', type)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo resolver el contenido: ${error.message}`)
  }

  return data?.id ?? null
}

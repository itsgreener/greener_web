import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type { PublicContentMedia } from './publicContentSource'

/**
 * Primer medio del primer pin de un contenido (orden de cola, luego
 * antigüedad). Tool e insight ya no tienen portada propia (§2.40): su
 * imagen de compartición (OG) sale de aquí. Devuelve null si el contenido
 * no tiene pines con medios o si la lectura falla (los metadatos nunca
 * deben tumbar la página).
 */
export async function getFirstPinMedia(
  contentId: string,
  client?: AppSupabaseClient,
): Promise<PublicContentMedia | null> {
  const supabase = client ?? createPublicReadClient()

  const { data, error } = await supabase
    .from('pin')
    .select(
      `
      pin_media (
        slide_order,
        media_asset ( kind, cloudinary_public_id )
      )
    `,
    )
    .eq('content_id', contentId)
    .order('queue_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const first = [...data.pin_media]
    .filter((item) => item.media_asset !== null)
    .sort((a, b) => a.slide_order - b.slide_order)[0]

  if (!first?.media_asset) return null

  return {
    kind: first.media_asset.kind,
    cloudinaryPublicId: first.media_asset.cloudinary_public_id,
  }
}

import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type {
  PublicContentMedia,
  PublicPinCover,
} from '@/modules/content/domain/publicContent'

/**
 * Primer pin de un contenido (orden de cola, luego antigüedad) con su primer
 * medio, su ratio y su alt. Tool no tiene portada propia (§2.40):
 * cuando la ficha no llega desde un pin (`/tools/{slug}` sin `?pin=`), este
 * pin es la portada de la ficha y su medio es la imagen de compartición (OG). Devuelve null si el contenido no
 * tiene pines con medios o si la lectura falla (los metadatos nunca deben
 * tumbar la página).
 */
export async function getFirstPinCover(
  contentId: string,
  client?: AppSupabaseClient,
): Promise<PublicPinCover | null> {
  const supabase = client ?? createPublicReadClient()

  const { data, error } = await supabase
    .from('pin')
    .select(
      `
      ratio,
      alt,
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
    ratio: data.ratio,
    alt: data.alt,
    media: {
      kind: first.media_asset.kind,
      cloudinaryPublicId: first.media_asset.cloudinary_public_id,
    },
  }
}

/** Solo el medio del primer pin (imagen de compartición). */
export async function getFirstPinMedia(
  contentId: string,
  client?: AppSupabaseClient,
): Promise<PublicContentMedia | null> {
  return (await getFirstPinCover(contentId, client))?.media ?? null
}

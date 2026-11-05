import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'

import type { PublicPinCover } from '@/modules/content/domain/publicContent'

/**
 * Portada de una ficha desde un pin concreto. Seguridad: el pin se filtra
 * también por content_id, de modo que no se puede usar `?pin=` para inyectar
 * el medio de otro contenido. Un pin es un único medio.
 */
export async function getPublicPinCover(
  contentId: string,
  pinId: string,
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
    .eq('id', pinId)
    .eq('content_id', contentId)
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

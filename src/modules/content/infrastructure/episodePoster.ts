import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'
import type { PublicContentMedia } from '@/modules/content/domain/publicContent'

/** Un pin tal como lo lee `getEpisodePoster`, ya ordenado por cola. */
export interface PosterCandidatePin {
  ratio: string
  media: PublicContentMedia[]
}

/** Proporción del reproductor del episodio (16:9): la de su portada. */
const POSTER_RATIO = '16:9'

/**
 * Elige la portada previa al reproductor de un episodio:
 *
 * 1. la primera IMAGEN de un pin de proporción 16:9 (encaja con el
 *    reproductor sin recortes), en orden de cola;
 * 2. si no hay ninguna, el primer medio del primer pin, como antes (en un
 *    vídeo se usa su póster).
 *
 * Función pura: recibe los pines ya ordenados.
 */
export function pickEpisodePoster(
  pins: readonly PosterCandidatePin[],
): PublicContentMedia | null {
  for (const pin of pins) {
    if (pin.ratio !== POSTER_RATIO) continue
    const image = pin.media.find((media) => media.kind === 'image')
    if (image) return image
  }

  for (const pin of pins) {
    if (pin.media[0]) return pin.media[0]
  }

  return null
}

/**
 * Portada previa al reproductor del episodio (ver `pickEpisodePoster`).
 * Devuelve null si el episodio no tiene pines con medios o si la lectura
 * falla (la ficha nunca debe caerse por la portada).
 */
export async function getEpisodePoster(
  contentId: string,
  client?: AppSupabaseClient,
): Promise<PublicContentMedia | null> {
  const supabase = client ?? createPublicReadClient()

  const { data, error } = await supabase
    .from('pin')
    .select(
      `
      ratio,
      pin_media (
        slide_order,
        media_asset ( kind, cloudinary_public_id )
      )
    `,
    )
    .eq('content_id', contentId)
    .order('queue_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) return null

  return pickEpisodePoster(
    data.map((pin) => ({
      ratio: pin.ratio,
      media: [...pin.pin_media]
        .filter((item) => item.media_asset !== null)
        .sort((a, b) => a.slide_order - b.slide_order)
        .flatMap((item) =>
          item.media_asset
            ? [
                {
                  kind: item.media_asset.kind,
                  cloudinaryPublicId: item.media_asset.cloudinary_public_id,
                },
              ]
            : [],
        ),
    })),
  )
}

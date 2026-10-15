import type { PublicPinCover } from '@/modules/content/domain/publicContent'
import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'

/**
 * Portada de la ficha de una tool, que no tiene portada propia (§2.40). Si la ficha llega desde un pin (`?pin=`), el medio de ese pin; si
 * no hay `?pin=`, o apunta a un pin que no es de este contenido o sin medios,
 * el primer pin del contenido. Así la URL canónica (sitemap, `llms.txt`,
 * Google, un enlace compartido) enseña lo mismo que el feed en vez de un
 * hueco vacío. Null solo si el contenido no tiene ningún pin con medio.
 */
export async function resolveDetailCover(
  reader: Pick<PublicContentReader, 'pinCover' | 'firstPinCover'>,
  contentId: string,
  pinId?: string,
): Promise<PublicPinCover | null> {
  if (pinId) {
    const fromPin = await reader.pinCover(contentId, pinId)
    if (fromPin) return fromPin
  }

  return reader.firstPinCover(contentId)
}

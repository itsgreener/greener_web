import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import {
  reorderCaseCarouselSchema,
  type ReorderCaseCarouselInput,
} from '@/modules/media/domain/mediaAssetSchema'

/**
 * Deja las diapositivas del carrusel en el orden recibido (la lista completa,
 * no un cambio suelto). Postgres comprueba que coincide con lo que hay y
 * renumera sin huecos ni empates.
 */
export function makeReorderCaseCarousel({
  media,
}: {
  media: MediaAssetRepository
}) {
  return async function reorderCaseCarousel(
    input: ReorderCaseCarouselInput,
  ): Promise<number> {
    return media.reorderCaseCarousel(reorderCaseCarouselSchema.parse(input))
  }
}

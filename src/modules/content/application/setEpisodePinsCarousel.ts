import {
  setPinsCarouselSchema,
  type SetPinsCarouselInput,
} from '@/modules/content/domain/contentSchema'
import type { ContentRepository } from '@/modules/content/domain/contentRepository'

/**
 * Activa o desactiva que los pines de un episodio formen un único carrusel en
 * el feed (§2.150). Postgres comprueba que es un episodio y que, al activar,
 * todos sus pines comparten ratio (ZG019).
 */
export function makeSetEpisodePinsCarousel({
  contents,
}: {
  contents: ContentRepository
}) {
  return async function setEpisodePinsCarousel(
    input: SetPinsCarouselInput,
  ): Promise<boolean> {
    return contents.setPinsCarousel(setPinsCarouselSchema.parse(input))
  }
}

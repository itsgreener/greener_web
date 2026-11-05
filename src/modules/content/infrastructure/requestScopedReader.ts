import { cache } from 'react'

import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'

/**
 * Una memoria por petición y por lector. `cache` de React dura lo que dura
 * el render del servidor, así que `generateMetadata` y la página comparten
 * las lecturas sin repetirlas y nada sobrevive entre peticiones.
 */
const memoryOf = cache((reader: PublicContentReader) => ({
  reader,
  results: new Map<string, Promise<unknown>>(),
}))

/**
 * Evita leer dos veces lo mismo dentro de una misma petición (metadata +
 * página, y el carrusel que pide también el SEO). Fuera de una petición de
 * React no memoriza nada: sigue siendo correcto, solo que sin ahorro.
 */
export function requestScopedReader(
  reader: PublicContentReader,
): PublicContentReader {
  function once<A extends unknown[], R>(
    name: string,
    read: (...args: A) => Promise<R>,
  ): (...args: A) => Promise<R> {
    return (...args) => {
      const { results } = memoryOf(reader)
      const key = `${name}:${JSON.stringify(args)}`

      let result = results.get(key) as Promise<R> | undefined

      if (!result) {
        result = read(...args)
        results.set(key, result)
      }

      return result
    }
  }

  return {
    contentBySlug: once('contentBySlug', (slug, locale) =>
      reader.contentBySlug(slug, locale),
    ),
    caseDetail: once('caseDetail', (id) => reader.caseDetail(id)),
    caseCarousel: once('caseCarousel', (id) => reader.caseCarousel(id)),
    episode: once('episode', (id) => reader.episode(id)),
    firstPinCover: once('firstPinCover', (id) => reader.firstPinCover(id)),
    episodePoster: once('episodePoster', (id) => reader.episodePoster(id)),
    pinCover: once('pinCover', (id, pinId) => reader.pinCover(id, pinId)),
    publishedContentId: once('publishedContentId', (type, slug) =>
      reader.publishedContentId(type, slug),
    ),
    publishedForSitemap: () => reader.publishedForSitemap(),
  }
}

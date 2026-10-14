import { describe, it, expect, vi } from 'vitest'

import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'

// `cache` de React solo memoriza dentro de un render del servidor. Aquí se
// simula una petición con un `cache` que recuerda por identidad de argumento.
vi.mock('react', () => ({
  cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
    const results = new Map<unknown, R>()

    return (...args: A) => {
      if (!results.has(args[0])) results.set(args[0], fn(...args))

      return results.get(args[0]) as R
    }
  },
}))

function fakeReader() {
  const reader = {
    contentBySlug: vi.fn(async () => null),
    caseDetail: vi.fn(async () => null),
    caseCarousel: vi.fn(async () => []),
    episode: vi.fn(async () => null),
    firstPinMedia: vi.fn(async () => null),
    episodePoster: vi.fn(async () => null),
    pinCover: vi.fn(async () => null),
    publishedContentId: vi.fn(async () => null),
    publishedForSitemap: vi.fn(async () => []),
  }

  return reader as typeof reader & PublicContentReader
}

describe('requestScopedReader', () => {
  it('la misma lectura dos veces en una petición llega una sola vez al origen', async () => {
    const { requestScopedReader } =
      await import('@/modules/content/infrastructure/requestScopedReader')
    const inner = fakeReader()
    const reader = requestScopedReader(inner)

    await reader.caseCarousel('c1')
    await reader.caseCarousel('c1')

    expect(inner.caseCarousel).toHaveBeenCalledTimes(1)
  })

  it('lecturas con argumentos distintos no se mezclan', async () => {
    const { requestScopedReader } =
      await import('@/modules/content/infrastructure/requestScopedReader')
    const inner = fakeReader()
    const reader = requestScopedReader(inner)

    await reader.contentBySlug('a', 'es')
    await reader.contentBySlug('a', 'en')
    await reader.contentBySlug('b', 'es')

    expect(inner.contentBySlug).toHaveBeenCalledTimes(3)
  })

  it('cada lector tiene su memoria: el de preview nunca lee lo que cacheó el público', async () => {
    const { requestScopedReader } =
      await import('@/modules/content/infrastructure/requestScopedReader')
    const publicInner = fakeReader()
    const previewInner = fakeReader()

    await requestScopedReader(publicInner).caseDetail('c1')
    await requestScopedReader(previewInner).caseDetail('c1')

    expect(publicInner.caseDetail).toHaveBeenCalledTimes(1)
    expect(previewInner.caseDetail).toHaveBeenCalledTimes(1)
  })

  it('el sitemap no se memoriza', async () => {
    const { requestScopedReader } =
      await import('@/modules/content/infrastructure/requestScopedReader')
    const inner = fakeReader()
    const reader = requestScopedReader(inner)

    await reader.publishedForSitemap()
    await reader.publishedForSitemap()

    expect(inner.publishedForSitemap).toHaveBeenCalledTimes(2)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_OG_IMAGE } from '@/lib/pageMetadata'

const caseCarousel = vi.fn()

vi.mock('@/modules/content/container', () => ({
  publicContent: { caseCarousel, contentBySlug: vi.fn() },
}))

/**
 * RES-C3 en las fichas de caso y episodio: con imagen propia (primera imagen
 * del carrusel) se comparte esa; sin ella, la imagen de marca por defecto.
 */

type Content = Parameters<
  Awaited<
    typeof import('@/app/(public)/(detail)/work/[slug]/workContent')
  >['buildWorkMetadata']
>[0]

function content(overrides: Record<string, unknown> = {}): Content {
  return {
    id: 'c1',
    type: 'case',
    slug: 'mi-caso',
    defaultLocale: 'en',
    locale: 'en',
    availableLocales: ['en'],
    title: 'Mi caso',
    seoTitle: null,
    seoDescription: null,
    summary: null,
    highlight: null,
    body: null,
    ...overrides,
  } as unknown as Content
}

const images = (m: { openGraph?: unknown }) =>
  (m.openGraph as { images?: unknown[] } | null | undefined)?.images

beforeEach(() => {
  caseCarousel.mockReset()
})

describe('buildWorkMetadata — imagen para compartir', () => {
  it('un caso con imagen en el carrusel comparte la suya', async () => {
    caseCarousel.mockResolvedValue([
      { kind: 'image', cloudinaryPublicId: 'casos/portada' },
    ])
    const { buildWorkMetadata } =
      await import('@/app/(public)/(detail)/work/[slug]/workContent')

    const meta = await buildWorkMetadata(content())

    expect(images(meta)).toHaveLength(1)
    expect(String(images(meta)?.[0])).toContain('casos/portada')
  })

  it('un caso sin imágenes en el carrusel usa la de marca', async () => {
    caseCarousel.mockResolvedValue([])
    const { buildWorkMetadata } =
      await import('@/app/(public)/(detail)/work/[slug]/workContent')

    expect(images(await buildWorkMetadata(content()))).toEqual([
      DEFAULT_OG_IMAGE,
    ])
  })

  it('un episodio, sin imagen propia, usa la de marca', async () => {
    const { buildWorkMetadata } =
      await import('@/app/(public)/(detail)/work/[slug]/workContent')

    expect(
      images(await buildWorkMetadata(content({ type: 'episode' }))),
    ).toEqual([DEFAULT_OG_IMAGE])
    expect(caseCarousel).not.toHaveBeenCalled()
  })
})

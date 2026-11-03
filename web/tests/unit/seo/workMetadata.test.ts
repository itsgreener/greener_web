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
    publishedAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
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

const alternates = (m: { alternates?: unknown }) =>
  m.alternates as
    | { canonical?: string; languages?: Record<string, string> }
    | null
    | undefined

describe('buildWorkMetadata — canónica e idiomas', () => {
  it('un caso de un solo idioma: canónica propia y sin hreflang', async () => {
    caseCarousel.mockResolvedValue([])
    const { buildWorkMetadata } =
      await import('@/app/(public)/(detail)/work/[slug]/workContent')

    const a = alternates(await buildWorkMetadata(content()))

    expect(a?.canonical).toBe('/work/mi-caso')
    expect(a?.languages).toBeUndefined()
  })

  it('un episodio declara su ruta /work/[slug] como canónica', async () => {
    const { buildWorkMetadata } =
      await import('@/app/(public)/(detail)/work/[slug]/workContent')

    const a = alternates(
      await buildWorkMetadata(content({ type: 'episode', slug: 'ep-1' })),
    )

    expect(a?.canonical).toBe('/work/ep-1')
  })

  it('un caso en tres idiomas: la canónica va a la URL sin idioma y x-default apunta a ella', async () => {
    caseCarousel.mockResolvedValue([])
    const { buildWorkMetadata } =
      await import('@/app/(public)/(detail)/work/[slug]/workContent')

    const a = alternates(
      await buildWorkMetadata(
        content({ availableLocales: ['en', 'es', 'ca'] }),
      ),
    )

    expect(a?.canonical).toBe('/work/mi-caso')
    expect(a?.languages).toEqual({
      en: '/work/mi-caso',
      es: '/work/mi-caso/es',
      ca: '/work/mi-caso/ca',
      'x-default': '/work/mi-caso',
    })
  })

  it('una variante de idioma se apunta a sí misma, no a la URL por defecto', async () => {
    caseCarousel.mockResolvedValue([])
    const { buildWorkMetadata } =
      await import('@/app/(public)/(detail)/work/[slug]/workContent')

    const a = alternates(
      await buildWorkMetadata(
        content({ locale: 'es', availableLocales: ['en', 'es'] }),
      ),
    )

    expect(a?.canonical).toBe('/work/mi-caso/es')
    expect(a?.languages?.['x-default']).toBe('/work/mi-caso')
  })

  it('en preview no hay canónica ni alternativas', async () => {
    caseCarousel.mockResolvedValue([])
    const { buildWorkMetadata } =
      await import('@/app/(public)/(detail)/work/[slug]/workContent')

    const meta = await buildWorkMetadata(
      content({ availableLocales: ['en', 'es'] }),
      { noindex: true },
    )

    expect(meta.alternates).toBeUndefined()
    expect(meta.robots).toEqual({ index: false, follow: false })
  })
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

import { isValidElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { JsonLd } from '@/components/seo/JsonLd'
import type {
  PublicContent,
  PublicEpisode,
} from '@/modules/content/domain/publicContent'

/**
 * Qué datos estructurados emite cada página: home → Organization + WebSite;
 * caso → CreativeWork; episodio → PodcastEpisode; y NADA en preview. Se llama
 * a las páginas del servidor con un lector falso y se busca `<JsonLd>` en el
 * árbol que devuelven.
 */

const resolvePreview = vi.fn()
const publicReader = { caseDetail: vi.fn(), caseCarousel: vi.fn() }

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'https://itsgreener.com' },
}))
vi.mock('@/modules/content/container', () => ({
  resolvePreviewOfType: (...args: unknown[]) => resolvePreview(...args),
  publicContent: {
    contentBySlug: vi.fn(),
    caseDetail: (...a: unknown[]) => publicReader.caseDetail(...a),
    caseCarousel: (...a: unknown[]) => publicReader.caseCarousel(...a),
  },
}))
vi.mock('@/modules/analytics/ContentOpenTracker', () => ({
  ContentOpenTracker: () => null,
}))
vi.mock('@/components/detail/CaseDetail', () => ({ CaseDetail: () => null }))
vi.mock('@/components/detail/EpisodeDetail', () => ({
  EpisodeDetail: () => null,
}))
vi.mock('@/components/masonry/Feed', () => ({ Feed: () => null }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))

/** Todos los datos de los `<JsonLd>` del árbol, en orden. */
function jsonLdOf(node: ReactNode): Array<Record<string, unknown>> {
  if (Array.isArray(node)) return node.flatMap(jsonLdOf)
  if (!isValidElement(node)) return []

  const props = node.props as { data?: Record<string, unknown> } & {
    children?: ReactNode
  }

  if (node.type === JsonLd && props.data) return [props.data]

  return jsonLdOf(props.children)
}

function content(overrides: Partial<PublicContent> = {}): PublicContent {
  return {
    id: 'c1',
    type: 'case',
    slug: 'mi-caso',
    defaultLocale: 'es',
    locale: 'es',
    availableLocales: ['es'],
    title: 'Mi caso',
    seoTitle: null,
    seoDescription: null,
    summary: null,
    highlight: null,
    body: null,
    publishedAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
    ...overrides,
  }
}

const EPISODE: PublicEpisode = {
  program: 'brand_the_future',
  provider: 'youtube',
  embedId: 'abc',
  episodeKind: 'podcast',
  language: 'es',
  number: 3,
  episodeDate: '2026-09-20',
  durationSeconds: 1800,
}

const props = (preview?: string) => ({
  params: Promise.resolve({ slug: 'mi-caso' }),
  searchParams: Promise.resolve(preview ? { preview } : {}),
})

function resolved(
  c: PublicContent,
  isPreview: boolean,
  extra: Record<string, unknown> = {},
) {
  resolvePreview.mockResolvedValue({
    content: c,
    isPreview,
    reader: {
      caseDetail: async () => ({ client: null }),
      caseCarousel: async () => [
        {
          mediaId: 'm1',
          kind: 'image',
          cloudinaryPublicId: 'casos/portada',
          sortOrder: 0,
          alt: 'x',
          width: 10,
          height: 10,
        },
      ],
      episode: async () => EPISODE,
      episodePoster: async () => null,
      ...extra,
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('home', () => {
  it('emite Organization y WebSite', async () => {
    const { default: Home } = await import('@/app/(public)/(feed)/page')

    const [data] = jsonLdOf(Home())
    const graph = data['@graph'] as Array<{ '@type': string }>

    expect(graph.map((n) => n['@type'])).toEqual(['Organization', 'WebSite'])
  })
})

describe('/work/[slug]', () => {
  it('un caso emite un CreativeWork con la imagen de su carrusel', async () => {
    resolved(content(), false)
    const { default: WorkPage } =
      await import('@/app/(public)/(detail)/work/[slug]/page')

    const found = jsonLdOf(await WorkPage(props()))

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      '@type': 'CreativeWork',
      url: 'https://itsgreener.com/work/mi-caso',
    })
    expect(String(found[0].image)).toContain('casos/portada')
  })

  it('un episodio emite un PodcastEpisode y nunca un VideoObject', async () => {
    resolved(content({ type: 'episode' }), false)
    const { default: WorkPage } =
      await import('@/app/(public)/(detail)/work/[slug]/page')

    const found = jsonLdOf(await WorkPage(props()))

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      '@type': 'PodcastEpisode',
      episodeNumber: 3,
      duration: 'PT30M',
    })
    expect(JSON.stringify(found)).not.toContain('VideoObject')
  })

  it.each(['case', 'episode'] as const)(
    'en preview (%s) no emite datos estructurados',
    async (type) => {
      resolved(content({ type }), true)
      const { default: WorkPage } =
        await import('@/app/(public)/(detail)/work/[slug]/page')

      expect(jsonLdOf(await WorkPage(props('token')))).toEqual([])
    },
  )
})

describe('/work/[slug]/[locale]', () => {
  it('una variante de idioma emite un CreativeWork con su URL e idioma', async () => {
    const { publicContent } = await import('@/modules/content/container')
    vi.mocked(publicContent.contentBySlug).mockResolvedValue(
      content({ locale: 'en', availableLocales: ['es', 'en'] }),
    )
    publicReader.caseDetail.mockResolvedValue({ client: null })
    publicReader.caseCarousel.mockResolvedValue([])
    const { default: WorkLocalePage } =
      await import('@/app/(public)/(detail)/work/[slug]/[locale]/page')

    const found = jsonLdOf(
      await WorkLocalePage({
        params: Promise.resolve({ slug: 'mi-caso', locale: 'en' }),
      }),
    )

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      '@type': 'CreativeWork',
      url: 'https://itsgreener.com/work/mi-caso/en',
      inLanguage: 'en',
    })
  })
})

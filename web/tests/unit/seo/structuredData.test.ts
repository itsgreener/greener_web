import { describe, expect, it } from 'vitest'

import {
  ORGANIZATION_SAME_AS,
  caseJsonLd,
  episodeJsonLd,
  homeJsonLd,
  isoDuration,
} from '@/lib/structuredData'
import { serializeJsonLd } from '@/lib/serializeJsonLd'
import { socialItems } from '@/components/shell/Shell/navItems'
import type {
  PublicContent,
  PublicEpisode,
} from '@/modules/content/domain/publicContent'

const SITE = 'https://itsgreener.com'

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

function episode(overrides: Partial<PublicEpisode> = {}): PublicEpisode {
  return {
    program: 'brand_the_future',
    provider: 'youtube',
    embedId: 'abc',
    episodeKind: 'podcast',
    language: 'es',
    number: 7,
    episodeDate: '2026-09-20',
    durationSeconds: 3725,
    ...overrides,
  }
}

describe('homeJsonLd', () => {
  const data = homeJsonLd(SITE, 'Descripción') as {
    '@context': string
    '@graph': Array<Record<string, unknown>>
  }
  const organization = data['@graph'].find((n) => n['@type'] === 'Organization')
  const website = data['@graph'].find((n) => n['@type'] === 'WebSite')

  it('declara Organization y WebSite en un solo @graph', () => {
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@graph']).toHaveLength(2)
    expect(organization).toBeDefined()
    expect(website).toBeDefined()
  })

  it('la organización lleva nombre, URL absoluta, logo PNG y perfiles', () => {
    expect(organization).toMatchObject({
      name: 'Greener',
      url: 'https://itsgreener.com/',
      description: 'Descripción',
      logo: { url: 'https://itsgreener.com/apple-touch-icon.png' },
      sameAs: [...ORGANIZATION_SAME_AS],
    })
  })

  it('el WebSite enlaza a la organización como publisher por @id', () => {
    expect(website?.publisher).toEqual({ '@id': organization?.['@id'] })
    expect(website?.inLanguage).toBe('en')
  })

  it('acepta una URL con barra final sin duplicarla', () => {
    const json = JSON.stringify(homeJsonLd(`${SITE}/`, 'x'))
    expect(json).not.toContain('//apple-touch-icon')
    expect(json).not.toContain('.com//')
  })

  it('los perfiles son del mismo dominio que los del menú lateral', () => {
    const hosts = (urls: readonly string[]) =>
      urls.map((u) => new URL(u).host.replace(/^www\./, '')).sort()
    const menu = socialItems.filter((i) => i.external).map((i) => i.href)

    expect(hosts(ORGANIZATION_SAME_AS)).toEqual(hosts(menu))
  })
})

describe('caseJsonLd', () => {
  it('un caso es un CreativeWork con su URL canónica, idioma y fechas', () => {
    const data = caseJsonLd({
      siteUrl: SITE,
      content: content({ seoDescription: 'SEO' }),
      imageUrl: 'https://res.cloudinary.com/x/a.jpg',
    })

    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: 'Mi caso',
      description: 'SEO',
      url: 'https://itsgreener.com/work/mi-caso',
      inLanguage: 'es',
      datePublished: '2026-10-01T10:00:00.000Z',
      dateModified: '2026-10-15T10:00:00.000Z',
      image: 'https://res.cloudinary.com/x/a.jpg',
      publisher: { '@type': 'Organization', name: 'Greener' },
    })
  })

  it('una variante de idioma apunta a su propia URL e idioma', () => {
    const data = caseJsonLd({
      siteUrl: SITE,
      content: content({ locale: 'en' }),
    })

    expect(data.url).toBe('https://itsgreener.com/work/mi-caso/en')
    expect(data.inLanguage).toBe('en')
  })

  it('sin descripción SEO usa el highlight; sin nada, omite la propiedad', () => {
    expect(
      caseJsonLd({ siteUrl: SITE, content: content({ highlight: 'Frase' }) })
        .description,
    ).toBe('Frase')

    const bare = JSON.parse(
      serializeJsonLd(caseJsonLd({ siteUrl: SITE, content: content() })),
    )
    expect(bare).not.toHaveProperty('description')
    expect(bare).not.toHaveProperty('image')
  })
})

describe('episodeJsonLd', () => {
  const base = { siteUrl: SITE, content: content({ type: 'episode' }) }

  it('un episodio es un PodcastEpisode con serie, número, duración e idioma', () => {
    const data = episodeJsonLd({ ...base, episode: episode() })

    expect(data).toMatchObject({
      '@type': 'PodcastEpisode',
      name: 'Mi caso',
      url: 'https://itsgreener.com/work/mi-caso',
      inLanguage: 'es',
      datePublished: '2026-09-20',
      dateModified: '2026-10-15T10:00:00.000Z',
      episodeNumber: 7,
      duration: 'PT1H2M5S',
      partOfSeries: { '@type': 'PodcastSeries', name: 'Brand the Future' },
    })
  })

  it('sin fecha de emisión usa la de publicación; sin número ni duración los omite', () => {
    const data = JSON.parse(
      serializeJsonLd(
        episodeJsonLd({
          ...base,
          episode: episode({
            episodeDate: null,
            number: null,
            durationSeconds: null,
          }),
        }),
      ),
    )

    expect(data.datePublished).toBe('2026-10-01T10:00:00.000Z')
    expect(data).not.toHaveProperty('episodeNumber')
    expect(data).not.toHaveProperty('duration')
  })

  it.each(['youtube', 'spotify'] as const)(
    'no publica VideoObject ni contenido del reproductor (%s)',
    (provider) => {
      const json = serializeJsonLd(
        episodeJsonLd({
          ...base,
          episode: episode({ provider, embedId: 'SECRETO-ID' }),
        }),
      )

      expect(json).not.toContain('VideoObject')
      expect(json).not.toContain('embedUrl')
      expect(json).not.toContain('contentUrl')
      expect(json).not.toContain('SECRETO-ID')
    },
  )
})

describe('isoDuration', () => {
  it.each([
    [3725, 'PT1H2M5S'],
    [3600, 'PT1H'],
    [60, 'PT1M'],
    [45, 'PT45S'],
    [2400, 'PT40M'],
    [90.9, 'PT1M30S'],
  ])('%s s → %s', (seconds, expected) => {
    expect(isoDuration(seconds)).toBe(expected)
  })

  it.each([null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY, 0.4])(
    '%s no da duración',
    (seconds) => {
      expect(isoDuration(seconds)).toBeUndefined()
    },
  )
})

describe('serializeJsonLd', () => {
  it('escapa «<»: un título con </script> no puede cerrar la etiqueta', () => {
    const out = serializeJsonLd({
      name: '</script><img src=x onerror=alert(1)>',
    })

    expect(out).not.toContain('<')
    expect(JSON.parse(out).name).toBe('</script><img src=x onerror=alert(1)>')
  })

  it('escapa los separadores de línea U+2028 y U+2029 y sigue siendo JSON', () => {
    const value = `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c`
    const out = serializeJsonLd({ value })

    expect(out).not.toContain(String.fromCharCode(0x2028))
    expect(out).not.toContain(String.fromCharCode(0x2029))
    expect(JSON.parse(out).value).toBe(value)
  })
})

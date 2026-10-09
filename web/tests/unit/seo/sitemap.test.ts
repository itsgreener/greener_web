import { describe, it, expect } from 'vitest'

import {
  buildSitemapEntries,
  STATIC_SITEMAP_PATHS,
  type SitemapContentRow,
} from '@/modules/content/domain/sitemap'

const SITE = 'https://itsgreener.com'

function row(overrides: Partial<SitemapContentRow>): SitemapContentRow {
  return {
    type: 'case',
    slug: 'mi-caso',
    defaultLocale: 'es',
    updatedAt: '2026-09-20T10:00:00.000Z',
    locales: ['es'],
    ...overrides,
  }
}

const urls = (entries: { url: string }[]) => entries.map((e) => e.url)

describe('buildSitemapEntries — páginas fijas', () => {
  it('incluye las páginas fijas con el dominio real, la home con barra final', () => {
    const entries = buildSitemapEntries([], SITE)

    expect(urls(entries)).toEqual([
      'https://itsgreener.com/',
      'https://itsgreener.com/channel',
      'https://itsgreener.com/insights',
      'https://itsgreener.com/tools',
      'https://itsgreener.com/contact',
      'https://itsgreener.com/privacy',
    ])
    expect(entries).toHaveLength(STATIC_SITEMAP_PATHS.length)
  })

  it('no incluye nunca el ABM, la API, el callback de auth ni las demos', () => {
    const all = urls(buildSitemapEntries([row({})], SITE)).join(' ')

    expect(all).not.toMatch(/\/admin|\/api|\/auth|\/preview/)
  })
})

describe('buildSitemapEntries — URL base', () => {
  it('con barra final en la URL base no produce «//» en ninguna URL', () => {
    const entries = buildSitemapEntries(
      [row({ type: 'tool', slug: 'pixel-palette' })],
      'https://itsgreener.com/',
    )

    for (const url of urls(entries)) {
      expect(url.replace('https://', '')).not.toContain('//')
    }
    expect(urls(entries)).toContain(
      'https://itsgreener.com/tools/pixel-palette',
    )
  })
})

describe('buildSitemapEntries — rutas por tipo de contenido', () => {
  it('cada tipo va a su ruta pública (misma tabla que contentPath)', () => {
    const entries = buildSitemapEntries(
      [
        row({ type: 'case', slug: 'a' }),
        row({ type: 'episode', slug: 'b' }),
        row({ type: 'tool', slug: 'c' }),
        row({ type: 'insight', slug: 'd' }),
        row({ type: 'other', slug: 'e' }),
      ],
      SITE,
    )

    expect(urls(entries)).toEqual(
      expect.arrayContaining([
        'https://itsgreener.com/work/a',
        'https://itsgreener.com/work/b',
        'https://itsgreener.com/tools/c',
        'https://itsgreener.com/insights/d',
        'https://itsgreener.com/variety/e',
      ]),
    )
  })

  it('lleva la fecha de última modificación', () => {
    const [entry] = buildSitemapEntries([row({})], SITE).slice(-1)

    expect(entry.lastModified).toEqual(new Date('2026-09-20T10:00:00.000Z'))
  })

  it('una fecha inválida no rompe el sitemap: la entrada sale sin lastModified', () => {
    const [entry] = buildSitemapEntries(
      [row({ updatedAt: 'no-es-una-fecha' })],
      SITE,
    ).slice(-1)

    expect(entry.url).toBe('https://itsgreener.com/work/mi-caso')
    expect(entry.lastModified).toBeUndefined()
  })
})

describe('buildSitemapEntries — idiomas (hreflang, §7.7 / §18.1)', () => {
  const translated = row({
    slug: 'destroyer',
    defaultLocale: 'es',
    locales: ['es', 'en', 'ca'],
  })

  it('un caso con varias traducciones añade /work/[slug]/[locale] por cada idioma extra', () => {
    const entries = buildSitemapEntries([translated], SITE)

    expect(urls(entries)).toEqual(
      expect.arrayContaining([
        'https://itsgreener.com/work/destroyer',
        'https://itsgreener.com/work/destroyer/en',
        'https://itsgreener.com/work/destroyer/ca',
      ]),
    )
    // El idioma por defecto vive en la URL canónica, no en /work/x/es.
    expect(urls(entries)).not.toContain(
      'https://itsgreener.com/work/destroyer/es',
    )
  })

  it('todas las versiones se referencian entre sí con el mismo hreflang', () => {
    const entries = buildSitemapEntries([translated], SITE).filter((e) =>
      e.url.includes('/work/destroyer'),
    )
    const expected = {
      es: 'https://itsgreener.com/work/destroyer',
      en: 'https://itsgreener.com/work/destroyer/en',
      ca: 'https://itsgreener.com/work/destroyer/ca',
    }

    expect(entries).toHaveLength(3)
    for (const entry of entries) {
      expect(entry.alternates?.languages).toEqual(expected)
    }
  })

  it('un contenido de un solo idioma no lleva alternates ni rutas extra', () => {
    const entries = buildSitemapEntries([row({ locales: ['es'] })], SITE)
    const entry = entries.find((e) => e.url.endsWith('/work/mi-caso'))

    expect(entry?.alternates).toBeUndefined()
    expect(urls(entries).filter((u) => u.includes('/work/'))).toHaveLength(1)
  })

  it('tool, insight y other no tienen rutas por idioma aunque traigan varios locales', () => {
    const entries = buildSitemapEntries(
      [row({ type: 'tool', slug: 't', locales: ['es', 'en'] })],
      SITE,
    )

    expect(urls(entries).filter((u) => u.includes('/tools/t'))).toEqual([
      'https://itsgreener.com/tools/t',
    ])
  })

  it('no repite URLs aunque la fuente devuelva filas duplicadas', () => {
    const entries = buildSitemapEntries([row({}), row({})], SITE)

    expect(new Set(urls(entries)).size).toBe(entries.length)
  })
})

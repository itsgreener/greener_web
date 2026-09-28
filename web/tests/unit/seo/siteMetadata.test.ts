import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Todo lo que depende de NEXT_PUBLIC_SITE_URL: normalización, metadataBase,
 * robots.txt y el aviso de producción. `env.ts` se evalúa al importarlo,
 * así que cada test reinicia los módulos con el valor que quiere probar.
 */

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('NEXT_PUBLIC_SITE_URL', () => {
  it('se normaliza sin barra final: «https://itsgreener.com/» → «https://itsgreener.com»', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com/')

    const { env } = await import('@/lib/env')

    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://itsgreener.com')
  })

  it('recorta varias barras finales y deja intacta una URL que ya viene limpia', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com///')
    expect((await import('@/lib/env')).env.NEXT_PUBLIC_SITE_URL).toBe(
      'https://itsgreener.com',
    )

    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com')
    expect((await import('@/lib/env')).env.NEXT_PUBLIC_SITE_URL).toBe(
      'https://itsgreener.com',
    )
  })

  it('el link de preview ya no lleva «//» aunque la variable traiga barra final', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com/')
    const { env } = await import('@/lib/env')

    const url = `${env.NEXT_PUBLIC_SITE_URL}/work/mi-caso?preview=abc`

    expect(url).toBe('https://itsgreener.com/work/mi-caso?preview=abc')
  })

  it('sin definir, en producción, avisa en voz alta de que se usa localhost', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined)
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { env } = await import('@/lib/env')

    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('NEXT_PUBLIC_SITE_URL'),
    )
  })

  it('definida en producción, no avisa', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com')
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await import('@/lib/env')

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('metadataBase y favicon del layout raíz', () => {
  it('metadataBase es el dominio público (para que hreflang y og:image relativos salgan bien)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com/')

    const { metadata } = await import('@/app/layout')

    expect(metadata.metadataBase?.toString()).toBe('https://itsgreener.com/')
  })

  it('declara el favicon (evita el 404 de /favicon.ico en cada visita)', async () => {
    const { metadata } = await import('@/app/layout')

    expect(metadata.icons).toEqual({ icon: '/icons/logo_greener.svg' })
  })
})

describe('robots.txt', () => {
  it('bloquea el ABM, la API, el callback de auth y las demos, y deja el resto abierto', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com')

    const robots = (await import('@/app/robots')).default()
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules]

    expect(rules).toHaveLength(1)
    expect(rules[0].userAgent).toBe('*')
    expect(rules[0].allow).toBe('/')
    expect(rules[0].disallow).toEqual(['/admin', '/api/', '/auth', '/preview'])
  })

  it('apunta al sitemap con el dominio público y sin «//», venga o no con barra final la variable', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com/')

    const robots = (await import('@/app/robots')).default()

    expect(robots.sitemap).toBe('https://itsgreener.com/sitemap.xml')
  })
})

describe('sitemap.xml', () => {
  it('une las páginas fijas con el contenido publicado, con el dominio público', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://itsgreener.com/')
    vi.doMock('@/modules/content/infrastructure/publicSitemapSource', () => ({
      listPublishedForSitemap: async () => [
        {
          type: 'tool',
          slug: 'pixel-palette',
          defaultLocale: 'en',
          updatedAt: '2026-09-20T10:00:00.000Z',
          locales: ['en'],
        },
      ],
    }))

    const entries = await (await import('@/app/sitemap')).default()
    const urls = entries.map((entry) => entry.url)

    expect(urls[0]).toBe('https://itsgreener.com/')
    expect(urls).toContain('https://itsgreener.com/tools/pixel-palette')
    expect(urls.every((url) => url.startsWith('https://itsgreener.com'))).toBe(
      true,
    )
  })
})

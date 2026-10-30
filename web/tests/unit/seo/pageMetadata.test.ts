import { describe, expect, it } from 'vitest'

import {
  DEFAULT_OG_IMAGE,
  buildOpenGraph,
  buildPageMetadata,
} from '@/lib/pageMetadata'
import { STATIC_SITEMAP_PATHS } from '@/modules/content/domain/sitemap'

/**
 * RES-C2 y RES-C3: cada página indexable tiene su título, su descripción y una
 * imagen para compartir, y no hay dos iguales. Si se añade una página fija sin
 * metadatos propios (o se copia el texto de otra), falla aquí.
 */

const PAGE_MODULES: Record<string, () => Promise<{ metadata: unknown }>> = {
  '/': () => import('@/app/(public)/(feed)/page'),
  '/work': () => import('@/app/(public)/(feed)/work/page'),
  '/channel': () => import('@/app/(public)/(feed)/channel/page'),
  '/insights': () => import('@/app/(public)/(feed)/insights/page'),
  '/tools': () => import('@/app/(public)/(feed)/tools/page'),
  '/contact': () => import('@/app/(public)/contact/page'),
  '/privacy': () => import('@/app/(public)/privacy/page'),
}

type Loaded = {
  title: unknown
  description: string
  openGraph: { images: unknown[]; title?: string; description?: string }
}

async function load(path: string): Promise<Loaded> {
  return (await PAGE_MODULES[path]()).metadata as Loaded
}

function titleText(title: unknown): string {
  if (typeof title === 'string') return title
  return (title as { absolute: string }).absolute
}

describe('metadatos de las páginas fijas indexables', () => {
  it('cubre todas las rutas fijas del sitemap (una nueva sin metadatos rompe este test)', () => {
    expect(Object.keys(PAGE_MODULES).sort()).toEqual(
      [...STATIC_SITEMAP_PATHS].sort(),
    )
  })

  it('cada página tiene título y descripción propios, no vacíos', async () => {
    for (const path of STATIC_SITEMAP_PATHS) {
      const meta = await load(path)

      expect(titleText(meta.title).length, `${path}: título`).toBeGreaterThan(0)
      expect(meta.description.length, `${path}: descripción`).toBeGreaterThan(
        20,
      )
    }
  })

  it('no hay dos páginas con el mismo título ni la misma descripción', async () => {
    const titles = new Set<string>()
    const descriptions = new Set<string>()

    for (const path of STATIC_SITEMAP_PATHS) {
      const meta = await load(path)
      titles.add(titleText(meta.title))
      descriptions.add(meta.description)
    }

    expect(titles.size).toBe(STATIC_SITEMAP_PATHS.length)
    expect(descriptions.size).toBe(STATIC_SITEMAP_PATHS.length)
  })

  it('todas llevan imagen para compartir, la de marca por defecto', async () => {
    for (const path of STATIC_SITEMAP_PATHS) {
      const meta = await load(path)

      expect(meta.openGraph.images, `${path}: og:image`).toEqual([
        DEFAULT_OG_IMAGE,
      ])
    }
  })

  it('la home lleva su título completo (sin el sufijo de la plantilla) y las demás usan la plantilla', async () => {
    expect((await load('/')).title).toEqual({
      absolute: expect.stringContaining('Greener'),
    })

    for (const path of STATIC_SITEMAP_PATHS.filter((p) => p !== '/')) {
      expect(typeof (await load(path)).title, path).toBe('string')
    }
  })
})

describe('buildOpenGraph', () => {
  it('sin imagen propia usa la de marca por defecto (1200 × 630)', () => {
    const og = buildOpenGraph({ title: 'T', description: 'D' })

    expect(og.images).toEqual([DEFAULT_OG_IMAGE])
    expect(DEFAULT_OG_IMAGE.width).toBe(1200)
    expect(DEFAULT_OG_IMAGE.height).toBe(630)
  })

  it('con imagen propia no añade la de marca', () => {
    const og = buildOpenGraph({ images: ['https://cdn.example/a.jpg'] })

    expect(og.images).toEqual(['https://cdn.example/a.jpg'])
  })

  it('una lista vacía cuenta como «sin imagen»', () => {
    expect(buildOpenGraph({ images: [] }).images).toEqual([DEFAULT_OG_IMAGE])
  })
})

describe('buildPageMetadata', () => {
  it('con absoluteTitle ignora la plantilla del layout', () => {
    expect(
      buildPageMetadata({ title: 'X', description: 'Y', absoluteTitle: true })
        .title,
    ).toEqual({ absolute: 'X' })
  })
})

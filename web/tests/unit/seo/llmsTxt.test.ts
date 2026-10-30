import { describe, expect, it } from 'vitest'

import { buildLlmsTxt } from '@/modules/content/domain/llmsTxt'

describe('buildLlmsTxt', () => {
  const text = buildLlmsTxt('https://itsgreener.com')

  it('empieza por el título y el resumen en cita, como pide el formato', () => {
    expect(text.startsWith('# Greener\n\n> ')).toBe(true)
  })

  it('enlaza las secciones públicas con URL absolutas y el sitemap', () => {
    for (const path of [
      '/',
      '/work',
      '/channel',
      '/insights',
      '/tools',
      '/contact',
    ]) {
      expect(text).toContain(`(https://itsgreener.com${path})`)
    }
    expect(text).toContain('(https://itsgreener.com/sitemap.xml)')
  })

  it('pide enlazar a la página de cada pieza y citar a Greener', () => {
    expect(text).toMatch(/link to that page and credit Greener/)
  })

  it('no enlaza ni nombra el ABM, la API ni el señuelo', () => {
    expect(text).not.toMatch(/admin|\/api|internal/i)
  })

  it('una barra final en la URL del sitio no duplica barras', () => {
    expect(buildLlmsTxt('https://itsgreener.com/')).not.toContain('com//')
  })
})

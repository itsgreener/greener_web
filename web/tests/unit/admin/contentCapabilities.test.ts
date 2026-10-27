import { describe, expect, it } from 'vitest'

import { contentCapabilities } from '@/app/admin/_lib/contentCapabilities'

describe('contentCapabilities', () => {
  it('un caso: ficha con destacado y cuerpo, SEO, pines y vista previa, sin paquete', () => {
    expect(contentCapabilities('case', null)).toEqual({
      allLocales: true,
      hasHighlightAndBody: true,
      hasSummary: false,
      hasSeo: true,
      hasPackage: false,
      hasPins: true,
      hasPreview: true,
    })
  })

  it('un episodio: un solo idioma, destacado y cuerpo, sin resumen ni paquete', () => {
    expect(contentCapabilities('episode', null)).toEqual({
      allLocales: false,
      hasHighlightAndBody: true,
      hasSummary: false,
      hasSeo: true,
      hasPackage: false,
      hasPins: true,
      hasPreview: true,
    })
  })

  it.each(['tool', 'insight'] as const)(
    '%s: resumen, SEO y paquete HTML, sin vista previa',
    (type) => {
      expect(contentCapabilities(type, null)).toMatchObject({
        allLocales: true,
        hasHighlightAndBody: false,
        hasSummary: true,
        hasSeo: true,
        hasPackage: true,
        hasPins: true,
        hasPreview: false,
      })
    },
  )

  it('other / página satélite: paquete y pines, sin resumen ni SEO propio de other', () => {
    expect(contentCapabilities('other', 'page')).toMatchObject({
      allLocales: false,
      hasSummary: false,
      hasSeo: false,
      hasPackage: true,
      hasPins: true,
    })
  })

  it('other / newsletter: sin pines ni paquete', () => {
    expect(contentCapabilities('other', 'newsletter')).toMatchObject({
      hasPins: false,
      hasPackage: false,
      hasSeo: false,
      hasSummary: true,
    })
  })

  it('other sin subtipo cargado: se trata como un other genérico', () => {
    expect(contentCapabilities('other', null)).toMatchObject({
      hasPackage: false,
      hasPins: true,
      hasSeo: false,
    })
  })
})

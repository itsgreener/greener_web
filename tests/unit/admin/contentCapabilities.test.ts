import { describe, expect, it } from 'vitest'

import { contentCapabilities } from '@/app/admin/_lib/contentCapabilities'

describe('contentCapabilities', () => {
  it('un caso: ficha con destacado y cuerpo, SEO, pines y vista previa, sin paquete', () => {
    expect(contentCapabilities('case', null)).toEqual({
      allLocales: true,
      pinLanguageFromContent: false,
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
      pinLanguageFromContent: true,
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
        hasHighlightAndBody: false,
        hasSummary: true,
        hasSeo: true,
        hasPackage: true,
        hasPins: true,
        hasPreview: false,
      })
    },
  )

  it.each([
    ['case', null, true],
    ['tool', null, true],
    ['episode', null, false],
    ['insight', null, false],
    ['other', 'page', false],
    ['other', 'newsletter', false],
    ['other', null, false],
  ] as const)(
    '%s (%s): se traduce a todos los idiomas = %s',
    (type, otherKind, expected) => {
      expect(contentCapabilities(type, otherKind).allLocales).toBe(expected)
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

describe('contentCapabilities — idioma de los pines', () => {
  it.each([
    ['case', null, false],
    ['tool', null, false],
    ['episode', null, true],
    ['insight', null, true],
    // Un other elige idioma por pin: decide el CTA de la página satélite.
    ['other', 'page', false],
    ['other', null, false],
  ] as const)(
    '%s (%s): los pines toman el idioma del contenido = %s',
    (type, otherKind, expected) => {
      expect(contentCapabilities(type, otherKind).pinLanguageFromContent).toBe(
        expected,
      )
    },
  )
})

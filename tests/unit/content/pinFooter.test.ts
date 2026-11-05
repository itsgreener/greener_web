import { describe, expect, it } from 'vitest'

import {
  derivedFeedLanguages,
  derivedFeedText,
  INSIGHT_PIN_SECONDARY_TEXT,
  type PinFooterContent,
} from '@/modules/content/domain/pinFooter'

const translations = [
  { locale: 'es', title: 'Título ES' },
  { locale: 'en', title: 'Title EN' },
]

const pin = { label: '  Descripción del pin  ', language: 'en' }

const base = (over: Partial<PinFooterContent>): PinFooterContent => ({
  type: 'case',
  defaultLocale: 'es',
  translations,
  ...over,
})

describe('derivedFeedText — pie del pin en el feed', () => {
  it('case: título del contenido en el idioma del pin y cliente; ignora la label antigua', () => {
    expect(
      derivedFeedText(pin, base({ type: 'case', caseClient: ' Agróptimum ' })),
    ).toEqual({
      label: null,
      displayTitle: 'Title EN',
      displaySecondary: 'Agróptimum',
    })
  })

  it('case sin cliente deja la segunda línea a null', () => {
    expect(
      derivedFeedText(pin, base({ type: 'case', caseClient: '   ' }))
        .displaySecondary,
    ).toBeNull()
  })

  it('tool: la label del pin es la descripción y el nombre de la tool, la segunda línea', () => {
    expect(derivedFeedText(pin, base({ type: 'tool' }))).toEqual({
      label: null,
      displayTitle: 'Descripción del pin',
      displaySecondary: 'Title EN',
    })
  })

  it('insight: título del contenido y texto fijo', () => {
    expect(derivedFeedText(pin, base({ type: 'insight' }))).toEqual({
      label: null,
      displayTitle: 'Title EN',
      displaySecondary: INSIGHT_PIN_SECONDARY_TEXT,
    })
  })

  it('episode: título y «programa + tipo»', () => {
    const text = derivedFeedText(
      pin,
      base({
        type: 'episode',
        episodeProgram: 'brand_the_future',
        episodeKind: 'podcast',
      }),
    )

    expect(text.displayTitle).toBe('Title EN')
    expect(text.displaySecondary).toBe('Brand the Future Podcast')
  })

  it('other: conserva la label escrita por el admin', () => {
    expect(derivedFeedText(pin, base({ type: 'other' }))).toEqual({
      label: '  Descripción del pin  ',
      displayTitle: null,
      displaySecondary: null,
    })
  })

  it('si no hay traducción en el idioma del pin, cae al idioma por defecto y luego a la primera', () => {
    expect(
      derivedFeedText(
        { label: null, language: 'fr' },
        base({ type: 'insight' }),
      ).displayTitle,
    ).toBe('Título ES')

    expect(
      derivedFeedText(
        { label: null, language: 'fr' },
        base({ type: 'insight', defaultLocale: 'de' }),
      ).displayTitle,
    ).toBe('Título ES')

    expect(
      derivedFeedText(
        { label: null, language: 'es' },
        base({ type: 'insight', translations: [] }),
      ).displayTitle,
    ).toBeNull()
  })
})

describe('derivedFeedLanguages — idioma real de cada texto del pie', () => {
  it('case, insight y episode: el título lleva el idioma de la traducción elegida', () => {
    for (const type of ['case', 'insight', 'episode'] as const) {
      expect(derivedFeedLanguages(pin, base({ type }))).toEqual({
        title: 'en',
        secondary: null,
      })
    }
  })

  it('si no hay traducción en el idioma del pin, declara el idioma al que cae, no el del pin', () => {
    expect(
      derivedFeedLanguages(
        { ...pin, language: 'ca' },
        base({ type: 'case', defaultLocale: 'es' }),
      ),
    ).toEqual({ title: 'es', secondary: null })
  })

  it('tool: la descripción va en el idioma del pin y el nombre en el de la traducción', () => {
    expect(derivedFeedLanguages(pin, base({ type: 'tool' }))).toEqual({
      title: 'en',
      secondary: 'en',
    })
  })

  it('tool sin descripción: no hay título que marcar', () => {
    expect(
      derivedFeedLanguages(
        { label: '  ', language: 'es' },
        base({ type: 'tool' }),
      ).title,
    ).toBeNull()
  })

  it('other: el gancho lleva el idioma del pin; sin gancho, nada', () => {
    expect(derivedFeedLanguages(pin, base({ type: 'other' }))).toEqual({
      title: 'en',
      secondary: null,
    })
    expect(
      derivedFeedLanguages(
        { label: null, language: 'es' },
        base({ type: 'other' }),
      ).title,
    ).toBeNull()
  })

  it('sin ninguna traducción, no inventa un idioma', () => {
    expect(
      derivedFeedLanguages(pin, base({ type: 'case', translations: [] })),
    ).toEqual({ title: null, secondary: null })
  })
})

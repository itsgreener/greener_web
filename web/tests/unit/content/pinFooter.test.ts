import { describe, expect, it } from 'vitest'

import {
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

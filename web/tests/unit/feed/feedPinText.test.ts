import { describe, it, expect } from 'vitest'
import {
  buildFeedUnitsForPin,
  INSIGHT_PIN_SECONDARY_TEXT,
} from '@/modules/feed/infrastructure/supabaseFeedSource'

const PIN = {
  id: 'pin-1',
  ratio: '4:5',
  label: 'Frase gancho antigua del admin',
  language: 'es',
  alt: 'alt',
  queue_order: 0,
  show_as_carousel: false,
  autoplay_mode: null,
  pin_media: [
    {
      media_id: 'm1',
      slide_order: 0,
      media_asset: { kind: 'image' as const, cloudinary_public_id: 'img-1' },
    },
  ],
}

const TRANSLATIONS = [
  { locale: 'es', title: 'El efecto Vozinha' },
  { locale: 'en', title: 'The Vozinha effect' },
]

function entryFor(content: Parameters<typeof buildFeedUnitsForPin>[1]) {
  return buildFeedUnitsForPin(PIN, content)[0].entry
}

describe('texto del pie del pin según el tipo de contenido', () => {
  it('insight: título del insight + texto fijo «Insights by Greener», sin el gancho antiguo', () => {
    const entry = entryFor({
      id: 'c1',
      type: 'insight',
      slug: 'vozinha',
      default_locale: 'es',
      content_translation: TRANSLATIONS,
    })

    expect(entry.displayTitle).toBe('El efecto Vozinha')
    expect(entry.displaySecondary).toBe('Insights by Greener')
    expect(entry.displaySecondary).toBe(INSIGHT_PIN_SECONDARY_TEXT)
    expect(entry.label).toBeNull()
  })

  it('insight: el título sigue el idioma del pin y cae al idioma por defecto', () => {
    const base = {
      id: 'c1',
      type: 'insight',
      slug: 'vozinha',
      default_locale: 'en',
      content_translation: TRANSLATIONS,
    }

    expect(entryFor(base).displayTitle).toBe('El efecto Vozinha')

    const sinEs = { ...base, content_translation: [TRANSLATIONS[1]] }
    expect(entryFor(sinEs).displayTitle).toBe('The Vozinha effect')
  })

  it('case: título + cliente, sin cambios', () => {
    const entry = entryFor({
      id: 'c2',
      type: 'case',
      slug: 'caso',
      default_locale: 'es',
      content_translation: [{ locale: 'es', title: 'Un caso' }],
      case_detail: { force: 1, client: ' Cliente SA ' },
    })

    expect(entry.displayTitle).toBe('Un caso')
    expect(entry.displaySecondary).toBe('Cliente SA')
    expect(entry.label).toBeNull()
  })

  it('tool: descripción del pin arriba + nombre de la tool en negrita debajo', () => {
    const entry = entryFor({
      id: 'c3',
      type: 'tool',
      slug: 'tool',
      default_locale: 'es',
      content_translation: [{ locale: 'es', title: 'Una tool' }],
    })

    // La frase del pin pasa a ser la primera línea; el nombre sale solo.
    expect(entry.displayTitle).toBe('Frase gancho antigua del admin')
    expect(entry.displaySecondary).toBe('Una tool')
    expect(entry.label).toBeNull()
  })

  it('tool: el nombre sigue el idioma del pin y la descripción se recorta', () => {
    const entry = buildFeedUnitsForPin(
      { ...PIN, label: '  Descripción con espacios  ', language: 'en' },
      {
        id: 'c3',
        type: 'tool',
        slug: 'tool',
        default_locale: 'es',
        content_translation: [
          { locale: 'es', title: 'Una tool' },
          { locale: 'en', title: 'A tool' },
        ],
      },
    )[0].entry

    expect(entry.displayTitle).toBe('Descripción con espacios')
    expect(entry.displaySecondary).toBe('A tool')
  })

  it('tool sin descripción en el pin: sin primera línea (displayTitle nulo)', () => {
    const entry = buildFeedUnitsForPin(
      { ...PIN, label: '   ' },
      {
        id: 'c3',
        type: 'tool',
        slug: 'tool',
        default_locale: 'es',
        content_translation: [{ locale: 'es', title: 'Una tool' }],
      },
    )[0].entry

    expect(entry.displayTitle).toBeNull()
    expect(entry.label).toBeNull()
  })

  it('other: sigue usando el rótulo del admin, sin líneas automáticas', () => {
    const entry = entryFor({
      id: 'c4',
      type: 'other',
      slug: 'otra-cosa',
      default_locale: 'es',
      content_translation: [{ locale: 'es', title: 'Otra cosa' }],
    })

    expect(entry.label).toBe('Frase gancho antigua del admin')
    expect(entry.displayTitle).toBeNull()
    expect(entry.displaySecondary).toBeNull()
  })
})

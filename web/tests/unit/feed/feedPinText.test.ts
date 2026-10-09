import { describe, it, expect } from 'vitest'
import type { AppSupabaseClient } from '@/lib/supabase/database'
import {
  buildFeedUnitsForPin,
  getFeedDataset,
  getPinDirectoryByIds,
  INSIGHT_PIN_SECONDARY_TEXT,
} from '@/modules/feed/infrastructure/supabaseFeedSource'

const PIN = {
  id: 'pin-1',
  ratio: '4:5',
  label: 'Frase gancho antigua del admin',
  language: 'es',
  alt: 'alt',
  queue_order: 0,
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
      type: 'insight' as const,
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

  it('episode: título + «<programa> <tipo>» en negrita (p. ej. «Brand the Future Podcast»)', () => {
    const entry = entryFor({
      id: 'c5',
      type: 'episode',
      slug: 'carlos-lledo',
      default_locale: 'es',
      content_translation: [
        {
          locale: 'es',
          title: 'Carlos Lledó nos cuenta su visión del mercado',
        },
      ],
      episode: { program: 'brand_the_future', episode_kind: 'podcast' },
    })

    expect(entry.displayTitle).toBe(
      'Carlos Lledó nos cuenta su visión del mercado',
    )
    expect(entry.displaySecondary).toBe('Brand the Future Podcast')
    expect(entry.label).toBeNull()
  })

  it('episode: cada programa sale con su nombre', () => {
    const secondary = (program: string) =>
      entryFor({
        id: 'c6',
        type: 'episode',
        slug: 'ep',
        default_locale: 'es',
        content_translation: [{ locale: 'es', title: 'Ep' }],
        episode: { program, episode_kind: 'podcast' },
      }).displaySecondary

    expect(secondary('brand_into_europe')).toBe('Brand into Europe Podcast')
    expect(secondary('brand_to_table')).toBe('Brand to Table Podcast')
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

/** Cliente de Supabase falso: captura el `select` y devuelve filas fijas. */
function fakeClient(rows: unknown[]) {
  const selects: string[] = []
  const builder = {
    select(columns: string) {
      selects.push(columns)
      return builder
    },
    eq: () => builder,
    in: () => builder,
    neq: () => builder,
    single: () => builder,
    // El builder real es «thenable»: la consulta se ejecuta al hacer await.
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  }
  return {
    selects,
    client: { from: () => builder } as unknown as AppSupabaseClient,
  }
}

describe('las dos consultas del feed piden el programa del episodio', () => {
  const EPISODE_PIN = {
    id: 'pin-ep',
    ratio: '4:5',
    label: null,
    language: 'es',
    alt: 'alt',
    queue_order: 0,
    autoplay_mode: null,
    pin_media: PIN.pin_media,
  }
  const EPISODE_CONTENT = {
    id: 'ep-1',
    type: 'episode',
    slug: 'ep-1',
    default_locale: 'es',
    content_translation: [{ locale: 'es', title: 'Un episodio' }],
    case_detail: null,
    episode: { program: 'brand_to_table', episode_kind: 'podcast' },
  }

  it('getFeedDataset (ronda nueva): select con `program` y segunda línea completa', async () => {
    const { client, selects } = fakeClient([
      { ...EPISODE_CONTENT, pin: [EPISODE_PIN] },
    ])

    const { pinDirectory } = await getFeedDataset('home', null, client)

    expect(selects[0]).toMatch(/episode \(\s*program,\s*episode_kind\s*\)/)
    expect(pinDirectory['pin-ep'].displaySecondary).toBe(
      'Brand to Table Podcast',
    )
  })

  it('getPinDirectoryByIds (ronda ya guardada): select con `program` y segunda línea completa', async () => {
    const { client, selects } = fakeClient([
      { ...EPISODE_PIN, content: EPISODE_CONTENT },
    ])

    const directory = await getPinDirectoryByIds(['pin-ep'], client)

    expect(selects[0]).toMatch(/episode \(\s*program,\s*episode_kind\s*\)/)
    expect(directory['pin-ep'].displaySecondary).toBe('Brand to Table Podcast')
  })
})

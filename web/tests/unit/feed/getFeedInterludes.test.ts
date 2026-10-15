import { describe, expect, it } from 'vitest'
import type { AppSupabaseClient } from '@/lib/supabase/database'
import { getFeedInterludes } from '@/modules/feed/infrastructure/supabaseFeedSource'
import { toFeedBatchItem } from '@/modules/feed/domain/feedItemPresentation'
import { typesForScope } from '@/modules/feed/domain/feedScope'

/**
 * Lectura de los contenidos `other` para el calendario de interludios (plan
 * de `other`, fase 2): titular y texto de la newsletter, pines de la página
 * en el orden del ABM y descarte de lo que no se puede servir.
 */

function pin(id: string, queueOrder: number, withMedia = true) {
  return {
    id,
    ratio: '4:5',
    label: null,
    language: 'es',
    alt: 'alt',
    queue_order: queueOrder,
    autoplay_mode: null,
    pin_media: withMedia
      ? [
          {
            media_id: `m-${id}`,
            slide_order: 0,
            media_asset: {
              kind: 'image' as const,
              cloudinary_public_id: `img-${id}`,
              duration_seconds: null,
            },
          },
        ]
      : [],
  }
}

function content(overrides: Record<string, unknown>) {
  return {
    id: 'c1',
    type: 'other',
    slug: 'una-pagina',
    default_locale: 'es',
    content_translation: [{ locale: 'es', title: 'Título', summary: 'Texto' }],
    other_detail: { kind: 'page', frequency: 100 },
    pin: [],
    ...overrides,
  }
}

function fakeClient(rows: unknown[]) {
  const filters: [string, unknown][] = []
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters.push([column, value])
      return builder
    },
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  }

  return {
    filters,
    client: { from: () => builder } as unknown as AppSupabaseClient,
  }
}

describe('getFeedInterludes', () => {
  it('lee solo contenidos `other` publicados', async () => {
    const { client, filters } = fakeClient([])

    await getFeedInterludes(client)

    expect(filters).toEqual([
      ['status', 'published'],
      ['type', 'other'],
    ])
  })

  it('newsletter: titular y texto de apoyo del idioma por defecto, con su frecuencia', async () => {
    const { client } = fakeClient([
      content({
        id: 'n1',
        slug: 'newsletter',
        default_locale: 'en',
        content_translation: [
          { locale: 'es', title: 'Suscríbete', summary: 'Una carta' },
          { locale: 'en', title: 'Subscribe', summary: 'A letter' },
        ],
        other_detail: { kind: 'newsletter', frequency: 75 },
      }),
    ])

    expect(await getFeedInterludes(client)).toEqual([
      {
        kind: 'newsletter',
        contentId: 'n1',
        frequency: 75,
        title: 'Subscribe',
        text: 'A letter',
      },
    ])
  })

  it('newsletter sin texto de apoyo: text null; sin titular: no entra', async () => {
    const { client } = fakeClient([
      content({
        id: 'n1',
        content_translation: [{ locale: 'es', title: 'Hola', summary: null }],
        other_detail: { kind: 'newsletter', frequency: 100 },
      }),
      content({
        id: 'n2',
        content_translation: [{ locale: 'es', title: '', summary: 'x' }],
        other_detail: { kind: 'newsletter', frequency: 100 },
      }),
    ])
    const result = await getFeedInterludes(client)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ contentId: 'n1', text: null })
  })

  it('página: sus pines con medio listo, en el orden del ABM', async () => {
    const { client } = fakeClient([
      content({
        id: 'p1',
        pin: [pin('b', 1), pin('sin-medio', 2, false), pin('a', 0)],
      }),
    ])
    const [page] = await getFeedInterludes(client)

    expect(page).toMatchObject({
      kind: 'page',
      contentId: 'p1',
      frequency: 100,
    })
    expect(
      page && page.kind === 'page' && page.pins.map((p) => p.pinId),
    ).toEqual(['a', 'b'])
  })

  it('ignora una página sin pines servibles y un `other` sin other_detail', async () => {
    const { client } = fakeClient([
      content({ id: 'vacia', pin: [pin('x', 0, false)] }),
      content({ id: 'sin-detalle', other_detail: null, pin: [pin('y', 0)] }),
    ])

    expect(await getFeedInterludes(client)).toEqual([])
  })

  it('propaga el error de Supabase', async () => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: 'boom' } }).then(
          resolve,
        ),
    }
    const client = { from: () => builder } as unknown as AppSupabaseClient

    await expect(getFeedInterludes(client)).rejects.toThrow('boom')
  })
})

describe('otros pines del feed', () => {
  it('la home ya no incluye `other` en la ronda: va como interludio', () => {
    expect(typesForScope('home')).not.toContain('other')
  })

  it('un pin de página abre /variety/{slug}/app con CTA «Open»', () => {
    const item = toFeedBatchItem('pin-1', {
      contentId: 'c1',
      contentType: 'other',
      contentSlug: 'mi-pagina',
      ratio: '1:1',
      label: null,
      alt: 'alt',
      autoplayMode: null,
      media: [{ kind: 'image', cloudinaryPublicId: 'img' }],
    })

    expect(item.destination).toBe('/variety/mi-pagina/app')
    expect(item.cta).toBe('Open')
  })
})

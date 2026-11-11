import { describe, expect, it } from 'vitest'
import {
  buildFeedUnitsForContent,
  getPinDirectoryByIds,
} from '@/modules/feed/infrastructure/supabaseFeedSource'
import type { AppSupabaseClient } from '@/lib/supabase/database'

/**
 * Pines de episodio como carrusel (§2.150): una sola unidad de feed con una
 * diapositiva por pin, y el mismo resultado se obtenga por la ruta de una
 * ronda nueva (`buildFeedUnitsForContent`) o por la de una ronda guardada
 * (`getPinDirectoryByIds`).
 */

type Content = Parameters<typeof buildFeedUnitsForContent>[1]
type Pin = Parameters<typeof buildFeedUnitsForContent>[0][number]

function content(overrides: Partial<Content> = {}): Content {
  return {
    id: 'ep1',
    type: 'episode',
    slug: 'mi-episodio',
    default_locale: 'es',
    pins_as_carousel: true,
    content_translation: [{ locale: 'es', title: 'Mi episodio' }],
    ...overrides,
  } as Content
}

function pin(
  id: string,
  queueOrder: number,
  kind: 'image' | 'video' | null = 'image',
  extra: Partial<Pin> = {},
): Pin {
  return {
    id,
    ratio: '4:5',
    label: null,
    language: 'es',
    alt: `alt ${id}`,
    queue_order: queueOrder,
    autoplay_mode: 'viewport',
    pin_media:
      kind === null
        ? []
        : [
            {
              media_id: `m-${id}`,
              slide_order: 0,
              media_asset: {
                kind,
                cloudinary_public_id: `pid-${id}`,
                duration_seconds: kind === 'video' ? 6 : null,
              },
            },
          ],
    ...extra,
  }
}

describe('buildFeedUnitsForContent', () => {
  it('con la marca activa: UNA unidad con el id del primer pin y una diapositiva por pin', () => {
    const units = buildFeedUnitsForContent(
      [pin('b', 1), pin('a', 0, 'video'), pin('c', 2)],
      content(),
    )

    expect(units).toHaveLength(1)
    expect(units[0].unitId).toBe('a')
    expect(units[0].entry.media).toEqual([
      {
        kind: 'video',
        cloudinaryPublicId: 'pid-a',
        durationSeconds: 6,
        alt: 'alt a',
        autoplayMode: 'viewport',
      },
      {
        kind: 'image',
        cloudinaryPublicId: 'pid-b',
        alt: 'alt b',
        autoplayMode: 'viewport',
      },
      {
        kind: 'image',
        cloudinaryPublicId: 'pid-c',
        alt: 'alt c',
        autoplayMode: 'viewport',
      },
    ])
    expect(units[0].entry.ratio).toBe('4:5')
    expect(units[0].entry.contentId).toBe('ep1')
  })

  it('ordena por queue_order y desempata por id', () => {
    const units = buildFeedUnitsForContent(
      [pin('z', 0), pin('y', 0), pin('x', 1)],
      content(),
    )

    expect(units[0].unitId).toBe('y')
    expect(units[0].entry.media.map((m) => m.cloudinaryPublicId)).toEqual([
      'pid-y',
      'pid-z',
      'pid-x',
    ])
  })

  it('los pines sin medio listo no son diapositivas', () => {
    const units = buildFeedUnitsForContent(
      [pin('a', 0, null), pin('b', 1), pin('c', 2)],
      content(),
    )

    expect(units[0].unitId).toBe('b')
    expect(units[0].entry.media).toHaveLength(2)
  })

  it('con un solo pin servible es un pin normal (sin alt por diapositiva)', () => {
    const units = buildFeedUnitsForContent(
      [pin('a', 0), pin('b', 1, null)],
      content(),
    )

    expect(units).toHaveLength(1)
    expect(units[0].unitId).toBe('a')
    expect(units[0].entry.media).toEqual([
      { kind: 'image', cloudinaryPublicId: 'pid-a' },
    ])
  })

  it('sin la marca, cada pin sigue siendo su propia unidad', () => {
    const units = buildFeedUnitsForContent(
      [pin('a', 0), pin('b', 1)],
      content({ pins_as_carousel: false }),
    )

    expect(units.map((u) => u.unitId)).toEqual(['a', 'b'])
  })

  it('la marca solo cuenta en episodios', () => {
    const units = buildFeedUnitsForContent(
      [pin('a', 0), pin('b', 1)],
      content({ type: 'case' }),
    )

    expect(units.map((u) => u.unitId)).toEqual(['a', 'b'])
  })

  it('nunca pasa de 8 diapositivas', () => {
    const pins = Array.from({ length: 10 }, (_, i) => pin(`p${i}`, i))
    const [unit] = buildFeedUnitsForContent(pins, content())

    expect(unit.entry.media).toHaveLength(8)
  })
})

/** Cliente de Supabase mínimo: devuelve filas fijas según la tabla y el filtro. */
function fakeClient(rows: { requested: unknown[]; siblings?: unknown[] }): {
  client: AppSupabaseClient
  calls: string[]
} {
  const calls: string[] = []
  const client = {
    from(table: string) {
      return {
        select: () => ({
          in: (column: string) => {
            calls.push(`${table}.${column}`)

            return Promise.resolve({
              data: column === 'id' ? rows.requested : (rows.siblings ?? []),
              error: null,
            })
          },
        }),
      }
    },
  } as unknown as AppSupabaseClient

  return { client, calls }
}

describe('getPinDirectoryByIds con carruseles', () => {
  const meta = content()
  const withContent = (p: Pin) => ({ ...p, content: meta })
  const siblings = [pin('a', 0), pin('b', 1), pin('c', 2)].map((p) => ({
    ...p,
    content_id: 'ep1',
  }))

  it('el id de la cabeza devuelve la unidad completa, igual que la ronda nueva', async () => {
    const { client, calls } = fakeClient({
      requested: [withContent(pin('a', 0))],
      siblings,
    })

    const directory = await getPinDirectoryByIds(['a'], client)
    const [fresh] = buildFeedUnitsForContent(
      [pin('a', 0), pin('b', 1), pin('c', 2)],
      meta,
    )

    expect(directory.a).toEqual(fresh.entry)
    expect(calls).toEqual(['pin.id', 'pin.content_id'])
  })

  it('un id que no es la cabeza no produce unidad (la ronda lo salta)', async () => {
    const { client } = fakeClient({
      requested: [withContent(pin('b', 1))],
      siblings,
    })

    expect(await getPinDirectoryByIds(['b'], client)).toEqual({})
  })

  it('sin episodios con carrusel no hace la segunda consulta', async () => {
    const { client, calls } = fakeClient({
      requested: [
        {
          ...pin('a', 0),
          content: content({ pins_as_carousel: false }),
        },
      ],
    })

    const directory = await getPinDirectoryByIds(['a'], client)

    expect(Object.keys(directory)).toEqual(['a'])
    expect(calls).toEqual(['pin.id'])
  })
})

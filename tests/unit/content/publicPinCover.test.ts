import { describe, expect, it } from 'vitest'

import type { AppSupabaseClient } from '@/lib/supabase/database'
import { getPublicPinCover } from '@/modules/content/infrastructure/publicPinCover'

type Result = { data: unknown; error: unknown }

/**
 * Cliente falso: apunta la tabla y los filtros `eq` con los que se consulta y
 * devuelve el resultado fijado. No hay base de datos.
 */
function fakeClient(result: Result) {
  const calls = { table: '', filters: [] as Array<[string, unknown]> }
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = (column: string, value: unknown) => {
    calls.filters.push([column, value])
    return chain
  }
  chain.maybeSingle = () => Promise.resolve(result)

  const client = {
    from: (table: string) => {
      calls.table = table
      return chain
    },
  } as unknown as AppSupabaseClient

  return { client, calls }
}

const asset = (kind: 'image' | 'video', id: string) => ({
  kind,
  cloudinary_public_id: id,
})

describe('getPublicPinCover', () => {
  it('consulta la tabla pin por id Y por content_id (no se puede inyectar el medio de otro contenido)', async () => {
    const { client, calls } = fakeClient({ data: null, error: null })

    await getPublicPinCover('content-1', 'pin-1', client)

    expect(calls.table).toBe('pin')
    expect(calls.filters).toEqual(
      expect.arrayContaining([
        ['id', 'pin-1'],
        ['content_id', 'content-1'],
      ]),
    )
    expect(calls.filters).toHaveLength(2)
  })

  it('sin fila (el pin es de otro contenido o no existe) devuelve null', async () => {
    const { client } = fakeClient({ data: null, error: null })

    expect(await getPublicPinCover('c', 'p', client)).toBeNull()
  })

  it('con error de la base de datos devuelve null, aunque venga una fila', async () => {
    const { client } = fakeClient({
      data: {
        ratio: '1:1',
        alt: 'x',
        pin_media: [{ slide_order: 0, media_asset: asset('image', 'a') }],
      },
      error: { message: 'boom' },
    })

    expect(await getPublicPinCover('c', 'p', client)).toBeNull()
  })

  it('elige el primer medio por slide_order y salta los medios nulos', async () => {
    const { client } = fakeClient({
      error: null,
      data: {
        ratio: '4:5',
        alt: 'Texto alternativo',
        pin_media: [
          { slide_order: 2, media_asset: asset('image', 'tercera') },
          { slide_order: 0, media_asset: null },
          { slide_order: 1, media_asset: asset('video', 'segunda') },
        ],
      },
    })

    expect(await getPublicPinCover('c', 'p', client)).toEqual({
      ratio: '4:5',
      alt: 'Texto alternativo',
      media: { kind: 'video', cloudinaryPublicId: 'segunda' },
    })
  })

  it('un pin sin medios devuelve null', async () => {
    const { client } = fakeClient({
      error: null,
      data: { ratio: '1:1', alt: null, pin_media: [] },
    })

    expect(await getPublicPinCover('c', 'p', client)).toBeNull()
  })

  it('un pin cuyos medios son todos nulos devuelve null', async () => {
    const { client } = fakeClient({
      error: null,
      data: {
        ratio: '1:1',
        alt: null,
        pin_media: [{ slide_order: 0, media_asset: null }],
      },
    })

    expect(await getPublicPinCover('c', 'p', client)).toBeNull()
  })
})

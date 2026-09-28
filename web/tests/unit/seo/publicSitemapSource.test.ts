import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { listPublishedForSitemap } from '@/modules/content/infrastructure/publicSitemapSource'

/**
 * Cliente de Supabase simulado: cada llamada encadenada devuelve el mismo
 * builder, y `range()` responde con la porción pedida de un catálogo.
 */
function fakeClient(total: number, failAtCall?: number) {
  const catalogue = Array.from({ length: total }, (_, i) => ({
    type: 'case',
    slug: `caso-${i}`,
    default_locale: 'es',
    updated_at: '2026-09-20T10:00:00.000Z',
    translations: [{ locale: 'es' }, { locale: 'en' }],
  }))

  const range = vi.fn()
  let calls = 0

  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: range.mockImplementation(async (from: number, to: number) => {
      calls += 1
      if (failAtCall === calls) {
        return { data: null, error: { message: 'boom' } }
      }
      return { data: catalogue.slice(from, to + 1), error: null }
    }),
  }

  const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient

  return { client, builder, range }
}

describe('listPublishedForSitemap', () => {
  it('pide solo contenido publicado y mapea las filas al formato del dominio', async () => {
    const { client, builder } = fakeClient(1)

    const rows = await listPublishedForSitemap(client)

    expect(builder.eq).toHaveBeenCalledWith('status', 'published')
    expect(rows).toEqual([
      {
        type: 'case',
        slug: 'caso-0',
        defaultLocale: 'es',
        updatedAt: '2026-09-20T10:00:00.000Z',
        locales: ['es', 'en'],
      },
    ])
  })

  it('con menos de una página hace una sola petición', async () => {
    const { client, range } = fakeClient(40)

    await listPublishedForSitemap(client)

    expect(range).toHaveBeenCalledTimes(1)
    expect(range).toHaveBeenCalledWith(0, 999)
  })

  it('pagina: un catálogo de 2.500 filas se lee entero, sin truncarse en 1.000', async () => {
    const { client, range } = fakeClient(2500)

    const rows = await listPublishedForSitemap(client)

    expect(rows).toHaveLength(2500)
    expect(range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('con exactamente una página llena pide una segunda (vacía) para confirmar el final', async () => {
    const { client, range } = fakeClient(1000)

    const rows = await listPublishedForSitemap(client)

    expect(rows).toHaveLength(1000)
    expect(range).toHaveBeenCalledTimes(2)
  })

  it('ordena con desempate por slug para que la paginación sea estable', async () => {
    const { client, builder } = fakeClient(1)

    await listPublishedForSitemap(client)

    expect(builder.order).toHaveBeenCalledWith('updated_at', {
      ascending: false,
    })
    expect(builder.order).toHaveBeenCalledWith('slug', { ascending: true })
  })

  it('un error de Supabase se propaga (mejor un 500 que un sitemap incompleto)', async () => {
    const { client } = fakeClient(2500, 2)

    await expect(listPublishedForSitemap(client)).rejects.toThrow(
      /sitemap.*boom/,
    )
  })
})

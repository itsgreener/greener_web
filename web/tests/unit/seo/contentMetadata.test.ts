import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { DEFAULT_OG_IMAGE } from '@/lib/pageMetadata'
import { getFirstPinCover } from '@/modules/content/infrastructure/firstPinMedia'
import type { PublicContent } from '@/modules/content/domain/publicContent'

function content(overrides: Partial<PublicContent> = {}): PublicContent {
  return {
    id: 'c1',
    type: 'tool',
    slug: 't',
    defaultLocale: 'es',
    locale: 'es',
    availableLocales: ['es'],
    title: 'Tool',
    seoTitle: null,
    seoDescription: null,
    summary: null,
    highlight: null,
    body: null,
    ...overrides,
  }
}

const images = (m: ReturnType<typeof buildContentMetadata>) =>
  (m.openGraph as { images?: unknown[] } | null | undefined)?.images

describe('imagen de OG sin portada (tool/insight)', () => {
  it('sin portada ni medio de respaldo usa la imagen de marca por defecto (RES-C3)', () => {
    expect(images(buildContentMetadata(content()))).toEqual([DEFAULT_OG_IMAGE])
  })

  it('usa la imagen del primer pin', () => {
    const m = buildContentMetadata(content(), {
      shareMedia: { kind: 'image', cloudinaryPublicId: 'pins/a' },
    })
    expect(images(m)).toHaveLength(1)
    expect(images(m)?.[0]).toContain('pins/a')
    expect(images(m)?.[0]).toContain('w_1200')
  })

  it('si el primer medio es vídeo usa su póster jpg', () => {
    const m = buildContentMetadata(content(), {
      shareMedia: { kind: 'video', cloudinaryPublicId: 'pins/v' },
    })
    expect(images(m)?.[0]).toContain('/video/upload/')
    expect(images(m)?.[0]).toContain('f_jpg')
    expect(images(m)?.[0]).toContain('pins/v')
  })
})

function fakeClient(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  for (const k of ['select', 'eq', 'order', 'limit']) chain[k] = () => chain
  chain.maybeSingle = async () => result
  return { from: () => chain } as unknown as SupabaseClient
}

describe('getFirstPinCover', () => {
  it('devuelve el medio de menor orden con el ratio y el alt del pin', async () => {
    const cover = await getFirstPinCover(
      'c1',
      fakeClient({
        error: null,
        data: {
          ratio: '16:9',
          alt: 'Pantalla de la tool',
          pin_media: [
            {
              slide_order: 1,
              media_asset: { kind: 'image', cloudinary_public_id: 'b' },
            },
            {
              slide_order: 0,
              media_asset: { kind: 'video', cloudinary_public_id: 'a' },
            },
          ],
        },
      }),
    )
    expect(cover).toEqual({
      ratio: '16:9',
      alt: 'Pantalla de la tool',
      media: { kind: 'video', cloudinaryPublicId: 'a' },
    })
  })

  it('devuelve null sin pines, sin medios o ante un error', async () => {
    expect(
      await getFirstPinCover('c1', fakeClient({ data: null, error: null })),
    ).toBeNull()
    expect(
      await getFirstPinCover('c1', fakeClient({ data: null, error: {} })),
    ).toBeNull()
    expect(
      await getFirstPinCover(
        'c1',
        fakeClient({
          error: null,
          data: { ratio: '4:5', alt: 'x', pin_media: [] },
        }),
      ),
    ).toBeNull()
  })
})

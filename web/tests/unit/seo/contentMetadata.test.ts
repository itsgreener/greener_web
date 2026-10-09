import { describe, expect, it } from 'vitest'
import { buildContentMetadata } from '@/lib/contentMetadata'
import { getFirstPinMedia } from '@/modules/content/infrastructure/firstPinMedia'
import type { PublicContent } from '@/modules/content/infrastructure/publicContentSource'
import type { SupabaseClient } from '@supabase/supabase-js'

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
    coverMedia: null,
    coverRatio: null,
    ...overrides,
  }
}

const images = (m: ReturnType<typeof buildContentMetadata>) =>
  (m.openGraph as { images?: string[] } | null | undefined)?.images

describe('imagen de OG sin portada (tool/insight)', () => {
  it('sin portada ni medio de respaldo no hay imagen', () => {
    expect(images(buildContentMetadata(content()))).toBeUndefined()
  })

  it('usa la imagen del primer pin', () => {
    const m = buildContentMetadata(content(), {
      shareMedia: { kind: 'image', cloudinaryPublicId: 'pins/a' },
    })
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

  it('la portada propia (other) tiene prioridad sobre el respaldo', () => {
    const m = buildContentMetadata(
      content({
        type: 'other',
        coverMedia: { kind: 'image', cloudinaryPublicId: 'cover/x' },
      }),
      { shareMedia: { kind: 'image', cloudinaryPublicId: 'pins/a' } },
    )
    expect(images(m)?.[0]).toContain('cover/x')
  })
})

function fakeClient(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  for (const k of ['select', 'eq', 'order', 'limit']) chain[k] = () => chain
  chain.maybeSingle = async () => result
  return { from: () => chain } as unknown as SupabaseClient
}

describe('getFirstPinMedia', () => {
  it('elige el slide de menor orden', async () => {
    const media = await getFirstPinMedia(
      'c1',
      fakeClient({
        error: null,
        data: {
          pin_media: [
            {
              slide_order: 1,
              media_asset: { kind: 'image', cloudinary_public_id: 'b' },
            },
            {
              slide_order: 0,
              media_asset: { kind: 'image', cloudinary_public_id: 'a' },
            },
          ],
        },
      }),
    )
    expect(media).toEqual({ kind: 'image', cloudinaryPublicId: 'a' })
  })

  it('devuelve null sin pines o ante un error', async () => {
    expect(
      await getFirstPinMedia('c1', fakeClient({ data: null, error: null })),
    ).toBeNull()
    expect(
      await getFirstPinMedia('c1', fakeClient({ data: null, error: {} })),
    ).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  getEpisodePoster,
  pickEpisodePoster,
  type PosterCandidatePin,
} from '@/modules/content/infrastructure/episodePoster'
import type { SupabaseClient } from '@supabase/supabase-js'

const image = (id: string) => ({
  kind: 'image' as const,
  cloudinaryPublicId: id,
})
const video = (id: string) => ({
  kind: 'video' as const,
  cloudinaryPublicId: id,
})

describe('pickEpisodePoster', () => {
  it('prefiere la primera imagen 16:9 aunque no sea la del primer pin', () => {
    const pins: PosterCandidatePin[] = [
      { ratio: '9:16', media: [image('vertical')] },
      { ratio: '16:9', media: [image('wide-1')] },
      { ratio: '16:9', media: [image('wide-2')] },
    ]
    expect(pickEpisodePoster(pins)).toEqual(image('wide-1'))
  })

  it('un pin 16:9 que es vídeo no cuenta como imagen 16:9', () => {
    const pins: PosterCandidatePin[] = [
      { ratio: '16:9', media: [video('clip')] },
      { ratio: '16:9', media: [image('wide')] },
    ]
    expect(pickEpisodePoster(pins)).toEqual(image('wide'))
  })

  it('sin ninguna imagen 16:9 usa el primer medio del primer pin (fallback)', () => {
    const pins: PosterCandidatePin[] = [
      { ratio: '1:1', media: [image('square')] },
      { ratio: '9:16', media: [image('vertical')] },
    ]
    expect(pickEpisodePoster(pins)).toEqual(image('square'))
  })

  it('el fallback también sirve si el primer pin es un vídeo (se usará su póster)', () => {
    expect(
      pickEpisodePoster([{ ratio: '16:9', media: [video('clip')] }]),
    ).toEqual(video('clip'))
  })

  it('salta pines sin medios al buscar el fallback y devuelve null sin ninguno', () => {
    expect(
      pickEpisodePoster([
        { ratio: '1:1', media: [] },
        { ratio: '4:5', media: [image('x')] },
      ]),
    ).toEqual(image('x'))
    expect(pickEpisodePoster([])).toBeNull()
    expect(pickEpisodePoster([{ ratio: '16:9', media: [] }])).toBeNull()
  })
})

function fakeClient(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  for (const k of ['select', 'eq']) chain[k] = () => chain
  chain.order = () => Object.assign(Promise.resolve(result), chain)
  return { from: () => chain } as unknown as SupabaseClient
}

describe('getEpisodePoster', () => {
  const asset = (kind: string, id: string) => ({
    kind,
    cloudinary_public_id: id,
  })

  it('lee los pines, ordena los slides y elige la imagen 16:9', async () => {
    const media = await getEpisodePoster(
      'c1',
      fakeClient({
        error: null,
        data: [
          {
            ratio: '1:1',
            pin_media: [{ slide_order: 0, media_asset: asset('image', 'sq') }],
          },
          {
            ratio: '16:9',
            pin_media: [
              { slide_order: 1, media_asset: asset('image', 'b') },
              { slide_order: 0, media_asset: asset('image', 'a') },
              { slide_order: 2, media_asset: null },
            ],
          },
        ],
      }),
    )
    expect(media).toEqual(image('a'))
  })

  it('devuelve null ante un error o sin datos', async () => {
    expect(
      await getEpisodePoster('c1', fakeClient({ data: null, error: {} })),
    ).toBeNull()
    expect(
      await getEpisodePoster('c1', fakeClient({ data: [], error: null })),
    ).toBeNull()
  })
})

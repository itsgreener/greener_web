import { describe, it, expect } from 'vitest'
import { buildFeedUnitsForPin } from '@/modules/feed/infrastructure/supabaseFeedSource'

const CONTENT = {
  id: 'c1',
  type: 'tool',
  slug: 'mi-tool',
  default_locale: 'es',
  content_translation: [{ locale: 'es', title: 'Mi tool' }],
} as unknown as Parameters<typeof buildFeedUnitsForPin>[1]

function pinWith(
  media: Array<{
    id: string
    kind: 'image' | 'video'
    publicId: string
    duration: number | null
  }>,
  showAsCarousel: boolean,
) {
  return {
    id: 'pin-1',
    ratio: '4:5',
    label: 'Gancho',
    language: 'es',
    alt: 'alt',
    queue_order: 0,
    show_as_carousel: showAsCarousel,
    autoplay_mode: 'viewport' as const,
    pin_media: media.map((m, i) => ({
      media_id: m.id,
      slide_order: i,
      media_asset: {
        kind: m.kind,
        cloudinary_public_id: m.publicId,
        duration_seconds: m.duration,
      },
    })),
  }
}

describe('duración de los vídeos en el directorio del feed (5 oct 2026)', () => {
  it('un pin de un vídeo lleva su duración al cliente', () => {
    const [unit] = buildFeedUnitsForPin(
      pinWith(
        [{ id: 'm1', kind: 'video', publicId: 'v1', duration: 12 }],
        false,
      ),
      CONTENT,
    )

    expect(unit.entry.media).toEqual([
      { kind: 'video', cloudinaryPublicId: 'v1', durationSeconds: 12 },
    ])
  })

  it('la imagen NO lleva duración (no significa nada en una imagen)', () => {
    const [unit] = buildFeedUnitsForPin(
      pinWith(
        [{ id: 'm1', kind: 'image', publicId: 'i1', duration: null }],
        false,
      ),
      CONTENT,
    )

    expect(unit.entry.media).toEqual([
      { kind: 'image', cloudinaryPublicId: 'i1' },
    ])
  })

  it('un vídeo sin duración guardada llega como null (el cliente lo trata como animable)', () => {
    const [unit] = buildFeedUnitsForPin(
      pinWith(
        [{ id: 'm1', kind: 'video', publicId: 'v1', duration: null }],
        false,
      ),
      CONTENT,
    )

    expect(unit.entry.media[0]).toMatchObject({ durationSeconds: null })
  })

  it('en un carrusel cada slide conserva su propia duración', () => {
    const [unit] = buildFeedUnitsForPin(
      pinWith(
        [
          { id: 'm1', kind: 'video', publicId: 'v1', duration: 6 },
          { id: 'm2', kind: 'video', publicId: 'v2', duration: 14 },
        ],
        true,
      ),
      CONTENT,
    )

    expect(unit.entry.media.map((m) => m.durationSeconds)).toEqual([6, 14])
  })

  it('un pin no-carrusel con varios medios se reparte en unidades, cada una con su duración', () => {
    const units = buildFeedUnitsForPin(
      pinWith(
        [
          { id: 'm1', kind: 'video', publicId: 'v1', duration: 6 },
          { id: 'm2', kind: 'video', publicId: 'v2', duration: 14 },
        ],
        false,
      ),
      CONTENT,
    )

    expect(units.map((u) => u.unitId)).toEqual(['pin-1::m1', 'pin-1::m2'])
    expect(units.map((u) => u.entry.media[0].durationSeconds)).toEqual([6, 14])
  })
})

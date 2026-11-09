import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Argumentos de las RPC del repositorio de medios. Con `Database` generado,
 * tsc detecta una RPC mal llamada, pero no un argumento opcional que se
 * olvida de enviar: este test fija los que importan del carrusel de casos.
 * La portada de `other` ya no existe (migración 20261015130000): sus RPC
 * `register_cover_*` y `unlink_and_delete_cover_media` desaparecen con ella.
 */

const rpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}))

import { supabaseMediaAssetRepository } from '@/modules/media/infrastructure/supabaseMediaAssetRepository'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockResolvedValue({ data: 'media-id', error: null })
})

describe('supabaseMediaAssetRepository — argumentos de las RPC', () => {
  it('addCaseCarouselVideo envía duración, orden y alt', async () => {
    await supabaseMediaAssetRepository.addCaseCarouselVideo({
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/videos/x',
      format: 'mp4',
      width: 1080,
      height: 1920,
      durationSeconds: 8,
      bytes: 1000,
      sortOrder: 2,
      alt: 'Recorrido',
    })

    expect(rpc).toHaveBeenCalledWith(
      'add_case_carousel_video',
      expect.objectContaining({
        p_duration_seconds: 8,
        p_sort_order: 2,
        p_alt: 'Recorrido',
      }),
    )
  })

  it('addCaseCarouselImage envía orden y alt', async () => {
    await supabaseMediaAssetRepository.addCaseCarouselImage({
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/x',
      format: 'webp',
      width: 1000,
      height: 1000,
      bytes: 1000,
      sortOrder: 0,
      alt: 'Equipo',
    })

    expect(rpc).toHaveBeenCalledWith(
      'add_case_carousel_image',
      expect.objectContaining({ p_sort_order: 0, p_alt: 'Equipo' }),
    )
  })

  it('removeCaseCarouselMedia envía contenido y medio', async () => {
    await supabaseMediaAssetRepository.removeCaseCarouselMedia({
      contentId: CONTENT_ID,
      mediaId: '22222222-2222-4222-8222-222222222222',
      cloudinaryPublicId: 'greener/content/x',
      kind: 'image',
    })

    expect(rpc).toHaveBeenCalledWith('remove_case_carousel_media', {
      p_content_id: CONTENT_ID,
      p_media_id: '22222222-2222-4222-8222-222222222222',
    })
  })

  it('reorderCaseCarousel envía la lista completa de ids', async () => {
    rpc.mockResolvedValue({ data: 2, error: null })

    await supabaseMediaAssetRepository.reorderCaseCarousel({
      contentId: CONTENT_ID,
      mediaIds: ['b', 'a'],
    })

    expect(rpc).toHaveBeenCalledWith('reorder_case_carousel', {
      p_content_id: CONTENT_ID,
      p_media_ids: ['b', 'a'],
    })
  })

  it('updateCaseCarouselAlt envía el medio y el alt', async () => {
    await supabaseMediaAssetRepository.updateCaseCarouselAlt({
      contentId: CONTENT_ID,
      mediaId: 'm1',
      alt: 'Nuevo',
    })

    expect(rpc).toHaveBeenCalledWith('update_case_carousel_alt', {
      p_content_id: CONTENT_ID,
      p_media_id: 'm1',
      p_alt: 'Nuevo',
    })
  })

  it('replaceCaseCarouselMedia (vídeo) envía tipo, medidas y duración', async () => {
    await supabaseMediaAssetRepository.replaceCaseCarouselMedia({
      kind: 'video',
      contentId: CONTENT_ID,
      mediaId: 'm1',
      cloudinaryPublicId: 'greener/content/videos/x',
      format: 'mp4',
      width: 1080,
      height: 1920,
      durationSeconds: 8,
      bytes: 1000,
      alt: 'Recorrido',
    })

    expect(rpc).toHaveBeenCalledWith(
      'replace_case_carousel_media',
      expect.objectContaining({
        p_content_id: CONTENT_ID,
        p_media_id: 'm1',
        p_kind: 'video',
        p_duration_seconds: 8,
        p_alt: 'Recorrido',
      }),
    )
  })

  it('replaceCaseCarouselMedia (imagen) no envía duración', async () => {
    await supabaseMediaAssetRepository.replaceCaseCarouselMedia({
      kind: 'image',
      contentId: CONTENT_ID,
      mediaId: 'm1',
      cloudinaryPublicId: 'greener/content/x',
      format: 'webp',
      width: 1000,
      height: 1000,
      bytes: 1000,
      alt: 'Equipo',
    })

    const args = rpc.mock.calls.at(-1)?.[1] as Record<string, unknown>

    expect(args.p_kind).toBe('image')
    expect(args.p_duration_seconds).toBeUndefined()
  })
})

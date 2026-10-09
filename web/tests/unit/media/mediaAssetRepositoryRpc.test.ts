import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Fase 2 (tipos de Supabase): con `Database` generado, tsc detectó que
 * `registerCoverVideo` no enviaba `p_ratio`, que la función de Postgres exige
 * desde 20260921091500_content_cover_ratio.sql. Subir un vídeo de portada
 * fallaba siempre con «function not found». Este test fija los argumentos.
 */

const rpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}))

import { supabaseMediaAssetRepository } from '@/modules/media/infrastructure/supabaseMediaAssetRepository'

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockResolvedValue({ data: 'media-id', error: null })
})

describe('supabaseMediaAssetRepository — argumentos de las RPC', () => {
  it('registerCoverVideo envía p_ratio', async () => {
    await supabaseMediaAssetRepository.registerCoverVideo({
      contentId: '11111111-1111-4111-8111-111111111111',
      cloudinaryPublicId: 'greener/content/videos/x',
      format: 'mp4',
      width: 1080,
      height: 1920,
      durationSeconds: 8,
      bytes: 1000,
      ratio: '9:16',
    })

    expect(rpc).toHaveBeenCalledWith(
      'register_cover_video',
      expect.objectContaining({ p_ratio: '9:16', p_duration_seconds: 8 }),
    )
  })

  it('registerCoverImage envía p_ratio', async () => {
    await supabaseMediaAssetRepository.registerCoverImage({
      contentId: '11111111-1111-4111-8111-111111111111',
      cloudinaryPublicId: 'greener/content/x',
      format: 'webp',
      width: 1000,
      height: 1000,
      bytes: 1000,
      ratio: '1:1',
    })

    expect(rpc).toHaveBeenCalledWith(
      'register_cover_image',
      expect.objectContaining({ p_ratio: '1:1' }),
    )
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const BLOCK_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'
const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

vi.mock('@/modules/media/infrastructure/supabaseMediaAssetRepository', () => ({
  supabaseMediaAssetRepository: {
    registerImageForBlock: vi.fn(),
    registerVideoForBlock: vi.fn(),
    unlinkAndDelete: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerImageForBlock', () => {
  const validInput = {
    blockId: BLOCK_ID,
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
  }

  it('valida con zod y delega en supabaseMediaAssetRepository.registerImageForBlock', async () => {
    const { registerImageForBlock } =
      await import('@/modules/media/application/registerImageForBlock')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    vi.mocked(
      supabaseMediaAssetRepository.registerImageForBlock,
    ).mockResolvedValue(MEDIA_ID)

    const result = await registerImageForBlock(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(
      supabaseMediaAssetRepository.registerImageForBlock,
    ).toHaveBeenCalledWith(validInput)
  })

  it('rechaza dimensiones inválidas (width 0) sin llamar al repositorio', async () => {
    const { registerImageForBlock } =
      await import('@/modules/media/application/registerImageForBlock')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    await expect(
      registerImageForBlock({ ...validInput, width: 0 }),
    ).rejects.toThrow()

    expect(
      supabaseMediaAssetRepository.registerImageForBlock,
    ).not.toHaveBeenCalled()
  })
})

describe('registerVideoForBlock', () => {
  const validInput = {
    blockId: BLOCK_ID,
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 45,
    bytes: 20 * 1024 * 1024,
  }

  it('valida con zod (incluida la transformación de duración) y delega en el repositorio', async () => {
    const { registerVideoForBlock } =
      await import('@/modules/media/application/registerVideoForBlock')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    vi.mocked(
      supabaseMediaAssetRepository.registerVideoForBlock,
    ).mockResolvedValue(MEDIA_ID)

    const result = await registerVideoForBlock({
      ...validInput,
      durationSeconds: 44.3,
    })

    expect(result).toBe(MEDIA_ID)
    // 44.3 se redondea a 45 antes de llegar al repositorio (mismo criterio
    // que aplicará luego register_video_for_block en Postgres, que exige
    // enteros implícitamente al comparar contra 180).
    expect(
      supabaseMediaAssetRepository.registerVideoForBlock,
    ).toHaveBeenCalledWith({
      ...validInput,
      durationSeconds: 45,
    })
  })

  it('rechaza un vídeo de más de 180 s sin llamar al repositorio — coincide con register_video_for_block (SQL)', async () => {
    const { registerVideoForBlock } =
      await import('@/modules/media/application/registerVideoForBlock')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    await expect(
      registerVideoForBlock({ ...validInput, durationSeconds: 200 }),
    ).rejects.toThrow()

    expect(
      supabaseMediaAssetRepository.registerVideoForBlock,
    ).not.toHaveBeenCalled()
  })

  it('rechaza un vídeo de más de 100 MB sin llamar al repositorio', async () => {
    const { registerVideoForBlock } =
      await import('@/modules/media/application/registerVideoForBlock')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    await expect(
      registerVideoForBlock({ ...validInput, bytes: 100 * 1024 * 1024 + 1 }),
    ).rejects.toThrow()

    expect(
      supabaseMediaAssetRepository.registerVideoForBlock,
    ).not.toHaveBeenCalled()
  })
})

describe('deleteBlockMedia', () => {
  const validInput = {
    blockId: BLOCK_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    kind: 'image' as const,
  }

  it('valida con zod y delega en supabaseMediaAssetRepository.unlinkAndDelete', async () => {
    const { deleteBlockMedia } =
      await import('@/modules/media/application/deleteBlockMedia')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    vi.mocked(supabaseMediaAssetRepository.unlinkAndDelete).mockResolvedValue(
      MEDIA_ID,
    )

    const result = await deleteBlockMedia(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(supabaseMediaAssetRepository.unlinkAndDelete).toHaveBeenCalledWith(
      validInput,
    )
  })

  it('rechaza un mediaId inválido sin llamar al repositorio', async () => {
    const { deleteBlockMedia } =
      await import('@/modules/media/application/deleteBlockMedia')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    await expect(
      deleteBlockMedia({ ...validInput, mediaId: 'no-es-uuid' }),
    ).rejects.toThrow()

    expect(supabaseMediaAssetRepository.unlinkAndDelete).not.toHaveBeenCalled()
  })
})

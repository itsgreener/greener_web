import { describe, it, expect, vi, beforeEach } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

vi.mock('@/modules/media/infrastructure/supabaseMediaAssetRepository', () => ({
  supabaseMediaAssetRepository: {
    registerCoverImage: vi.fn(),
    registerCoverVideo: vi.fn(),
    unlinkAndDeleteCoverMedia: vi.fn(),
    addCaseCarouselImage: vi.fn(),
    addCaseCarouselVideo: vi.fn(),
    removeCaseCarouselMedia: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerCoverImage', () => {
  const validInput = {
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
  }

  it('valida con zod y delega en supabaseMediaAssetRepository.registerCoverImage', async () => {
    const { registerCoverImage } =
      await import('@/modules/media/application/registerCoverImage')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    vi.mocked(
      supabaseMediaAssetRepository.registerCoverImage,
    ).mockResolvedValue(MEDIA_ID)

    const result = await registerCoverImage(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(
      supabaseMediaAssetRepository.registerCoverImage,
    ).toHaveBeenCalledWith(validInput)
  })

  it('rechaza dimensiones inválidas (width 0) sin llamar al repositorio', async () => {
    const { registerCoverImage } =
      await import('@/modules/media/application/registerCoverImage')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    await expect(
      registerCoverImage({ ...validInput, width: 0 }),
    ).rejects.toThrow()

    expect(
      supabaseMediaAssetRepository.registerCoverImage,
    ).not.toHaveBeenCalled()
  })
})

describe('registerCoverVideo — solo other (especificacion-final-formato-detalle.md §3)', () => {
  const validInput = {
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 45,
    bytes: 20 * 1024 * 1024,
  }

  it('valida con zod (incluida la transformación de duración) y delega en el repositorio', async () => {
    const { registerCoverVideo } =
      await import('@/modules/media/application/registerCoverVideo')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    vi.mocked(
      supabaseMediaAssetRepository.registerCoverVideo,
    ).mockResolvedValue(MEDIA_ID)

    const result = await registerCoverVideo({
      ...validInput,
      durationSeconds: 44.3,
    })

    expect(result).toBe(MEDIA_ID)
    expect(
      supabaseMediaAssetRepository.registerCoverVideo,
    ).toHaveBeenCalledWith({
      ...validInput,
      durationSeconds: 45,
    })
  })

  it('rechaza un vídeo de más de 180 s sin llamar al repositorio', async () => {
    const { registerCoverVideo } =
      await import('@/modules/media/application/registerCoverVideo')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    await expect(
      registerCoverVideo({ ...validInput, durationSeconds: 200 }),
    ).rejects.toThrow()

    expect(
      supabaseMediaAssetRepository.registerCoverVideo,
    ).not.toHaveBeenCalled()
  })
})

describe('deleteCoverMedia', () => {
  const validInput = {
    contentId: CONTENT_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    kind: 'image' as const,
  }

  it('valida con zod y delega en supabaseMediaAssetRepository.unlinkAndDeleteCoverMedia', async () => {
    const { deleteCoverMedia } =
      await import('@/modules/media/application/deleteCoverMedia')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    vi.mocked(
      supabaseMediaAssetRepository.unlinkAndDeleteCoverMedia,
    ).mockResolvedValue(MEDIA_ID)

    const result = await deleteCoverMedia(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(
      supabaseMediaAssetRepository.unlinkAndDeleteCoverMedia,
    ).toHaveBeenCalledWith(validInput)
  })

  it('rechaza un mediaId inválido sin llamar al repositorio', async () => {
    const { deleteCoverMedia } =
      await import('@/modules/media/application/deleteCoverMedia')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    await expect(
      deleteCoverMedia({ ...validInput, mediaId: 'no-es-uuid' }),
    ).rejects.toThrow()

    expect(
      supabaseMediaAssetRepository.unlinkAndDeleteCoverMedia,
    ).not.toHaveBeenCalled()
  })
})

describe('addCaseCarouselImage / addCaseCarouselVideo / removeCaseCarouselMedia — carrusel de caso (§3, §6)', () => {
  it('addCaseCarouselImage valida con zod y delega en el repositorio', async () => {
    const { addCaseCarouselImage } =
      await import('@/modules/media/application/addCaseCarouselImage')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    vi.mocked(
      supabaseMediaAssetRepository.addCaseCarouselImage,
    ).mockResolvedValue(MEDIA_ID)

    const input = {
      contentId: CONTENT_ID,
      cloudinaryPublicId: 'greener/content/abc123',
      format: 'webp',
      width: 1200,
      height: 800,
      bytes: 500_000,
      sortOrder: 0,
    }

    const result = await addCaseCarouselImage(input)

    expect(result).toBe(MEDIA_ID)
    expect(
      supabaseMediaAssetRepository.addCaseCarouselImage,
    ).toHaveBeenCalledWith(input)
  })

  it('addCaseCarouselVideo rechaza más de 180 s sin llamar al repositorio', async () => {
    const { addCaseCarouselVideo } =
      await import('@/modules/media/application/addCaseCarouselVideo')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    await expect(
      addCaseCarouselVideo({
        contentId: CONTENT_ID,
        cloudinaryPublicId: 'greener/content/videos/abc123',
        format: 'mp4',
        width: 1920,
        height: 1080,
        durationSeconds: 200,
        bytes: 20 * 1024 * 1024,
        sortOrder: 0,
      }),
    ).rejects.toThrow()

    expect(
      supabaseMediaAssetRepository.addCaseCarouselVideo,
    ).not.toHaveBeenCalled()
  })

  it('removeCaseCarouselMedia valida con zod y delega en el repositorio', async () => {
    const { removeCaseCarouselMedia } =
      await import('@/modules/media/application/removeCaseCarouselMedia')
    const { supabaseMediaAssetRepository } =
      await import('@/modules/media/infrastructure/supabaseMediaAssetRepository')

    vi.mocked(
      supabaseMediaAssetRepository.removeCaseCarouselMedia,
    ).mockResolvedValue(MEDIA_ID)

    const input = {
      contentId: CONTENT_ID,
      mediaId: MEDIA_ID,
      cloudinaryPublicId: 'greener/content/abc123',
      kind: 'image' as const,
    }

    const result = await removeCaseCarouselMedia(input)

    expect(result).toBe(MEDIA_ID)
    expect(
      supabaseMediaAssetRepository.removeCaseCarouselMedia,
    ).toHaveBeenCalledWith(input)
  })
})

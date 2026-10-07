import { beforeEach, describe, expect, it, vi } from 'vitest'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

const MEDIA_ID = '22222222-2222-4222-8222-222222222222'

const IMAGE_PUBLIC_ID = 'greener/content/case-image'

const VIDEO_PUBLIC_ID = 'greener/content/videos/case-video'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/media/application/addCaseCarouselImage', () => ({
  addCaseCarouselImage: vi.fn(),
}))

vi.mock('@/modules/media/application/addCaseCarouselVideo', () => ({
  addCaseCarouselVideo: vi.fn(),
}))

vi.mock('@/modules/content/application/getCaseCarousel', () => ({
  getCaseCarousel: vi.fn(),
}))

vi.mock('@/modules/media/application/removeCaseCarouselMedia', () => ({
  removeCaseCarouselMedia: vi.fn(),
}))

vi.mock('@/modules/media/infrastructure/cloudinaryServer', () => {
  class MockCloudinaryImageVerificationError extends Error {
    constructor(message: string) {
      super(message)

      this.name = 'CloudinaryImageVerificationError'
    }
  }

  class MockCloudinaryVideoVerificationError extends Error {
    constructor(message: string) {
      super(message)

      this.name = 'CloudinaryVideoVerificationError'
    }
  }

  return {
    CloudinaryImageVerificationError: MockCloudinaryImageVerificationError,

    CloudinaryVideoVerificationError: MockCloudinaryVideoVerificationError,

    verifyCloudinaryImageAsset: vi.fn(),

    verifyCloudinaryVideoAsset: vi.fn(),

    deleteCloudinaryAsset: vi.fn(),
  }
})

import {
  addCaseCarouselImageAction,
  addCaseCarouselVideoAction,
  removeAllCaseCarouselMediaAction,
  removeCaseCarouselMediaAction,
} from '@/app/admin/contents/[id]/edit/caseCarouselActions'

import { addCaseCarouselImage } from '@/modules/media/application/addCaseCarouselImage'

import { addCaseCarouselVideo } from '@/modules/media/application/addCaseCarouselVideo'

import { removeCaseCarouselMedia } from '@/modules/media/application/removeCaseCarouselMedia'

import { getCaseCarousel } from '@/modules/content/application/getCaseCarousel'

import {
  CloudinaryImageVerificationError,
  CloudinaryVideoVerificationError,
  deleteCloudinaryAsset,
  verifyCloudinaryImageAsset,
  verifyCloudinaryVideoAsset,
} from '@/modules/media/infrastructure/cloudinaryServer'

const mockAddCaseCarouselImage = vi.mocked(addCaseCarouselImage)

const mockAddCaseCarouselVideo = vi.mocked(addCaseCarouselVideo)

const mockRemoveCaseCarouselMedia = vi.mocked(removeCaseCarouselMedia)

const mockDeleteCloudinaryAsset = vi.mocked(deleteCloudinaryAsset)

const mockVerifyCloudinaryImageAsset = vi.mocked(verifyCloudinaryImageAsset)

const mockVerifyCloudinaryVideoAsset = vi.mocked(verifyCloudinaryVideoAsset)

const VALID_IMAGE_INPUT = {
  contentId: CONTENT_ID,

  cloudinaryPublicId: IMAGE_PUBLIC_ID,

  format: 'jpg',

  width: 10,

  height: 10,

  bytes: 10,

  sortOrder: 0,

  alt: 'Imagen del caso',
}

const VALID_VIDEO_INPUT = {
  contentId: CONTENT_ID,

  cloudinaryPublicId: VIDEO_PUBLIC_ID,

  format: 'mp4',

  width: 10,

  height: 10,

  durationSeconds: 1,

  bytes: 10,

  sortOrder: 1,

  alt: 'Vídeo del caso',
}

const VALID_REMOVE_INPUT = {
  contentId: CONTENT_ID,

  mediaId: MEDIA_ID,

  cloudinaryPublicId: VIDEO_PUBLIC_ID,

  kind: 'video' as const,
}

describe('caseCarouselActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockAddCaseCarouselImage.mockResolvedValue(MEDIA_ID)

    mockAddCaseCarouselVideo.mockResolvedValue(MEDIA_ID)

    mockVerifyCloudinaryImageAsset.mockImplementation(async (publicId) => ({
      cloudinaryPublicId: publicId,

      format: 'webp',

      width: 2000,

      height: 1000,

      bytes: 4096,
    }))

    mockVerifyCloudinaryVideoAsset.mockImplementation(async (publicId) => ({
      cloudinaryPublicId: publicId,

      format: 'mp4',

      width: 1920,

      height: 1080,

      durationSeconds: 24,

      bytes: 8192,
    }))
  })

  describe('addCaseCarouselImageAction', () => {
    it('verifica la imagen en Cloudinary antes de registrarla', async () => {
      const result = await addCaseCarouselImageAction(VALID_IMAGE_INPUT)

      expect(result).toEqual({
        ok: true,

        mediaId: MEDIA_ID,
      })

      expect(mockVerifyCloudinaryImageAsset).toHaveBeenCalledWith(
        IMAGE_PUBLIC_ID,
      )

      expect(mockAddCaseCarouselImage).toHaveBeenCalledWith({
        contentId: CONTENT_ID,

        cloudinaryPublicId: IMAGE_PUBLIC_ID,

        format: 'webp',

        width: 2000,

        height: 1000,

        bytes: 4096,

        sortOrder: 0,

        alt: 'Imagen del caso',
      })
    })

    it('si Cloudinary rechaza la imagen, no la registra', async () => {
      mockVerifyCloudinaryImageAsset.mockRejectedValueOnce(
        new CloudinaryImageVerificationError(
          'No se permiten imágenes animadas.',
        ),
      )

      const result = await addCaseCarouselImageAction(VALID_IMAGE_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'No se permiten imágenes animadas.',
      })

      expect(mockAddCaseCarouselImage).not.toHaveBeenCalled()
    })
  })

  describe('addCaseCarouselVideoAction', () => {
    it('verifica el vídeo en Cloudinary y usa los metadatos reales', async () => {
      const result = await addCaseCarouselVideoAction(VALID_VIDEO_INPUT)

      expect(result).toEqual({
        ok: true,

        mediaId: MEDIA_ID,
      })

      expect(mockVerifyCloudinaryVideoAsset).toHaveBeenCalledWith(
        VIDEO_PUBLIC_ID,
      )

      expect(mockAddCaseCarouselVideo).toHaveBeenCalledWith({
        contentId: CONTENT_ID,

        cloudinaryPublicId: VIDEO_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        durationSeconds: 24,

        bytes: 8192,

        sortOrder: 1,

        alt: 'Vídeo del caso',
      })
    })

    it('no confía en duración, tamaño ni dimensiones enviadas por el navegador', async () => {
      mockVerifyCloudinaryVideoAsset.mockResolvedValueOnce({
        cloudinaryPublicId: VIDEO_PUBLIC_ID,

        format: 'mp4',

        width: 2560,

        height: 1440,

        durationSeconds: 75,

        bytes: 16384,
      })

      const result = await addCaseCarouselVideoAction({
        ...VALID_VIDEO_INPUT,

        width: 1,

        height: 1,

        durationSeconds: 1,

        bytes: 1,
      })

      expect(result.ok).toBe(true)

      expect(mockAddCaseCarouselVideo).toHaveBeenCalledWith({
        contentId: CONTENT_ID,

        cloudinaryPublicId: VIDEO_PUBLIC_ID,

        format: 'mp4',

        width: 2560,

        height: 1440,

        durationSeconds: 75,

        bytes: 16384,

        sortOrder: 1,

        alt: 'Vídeo del caso',
      })
    })

    it('si Cloudinary rechaza el vídeo, no lo registra en Postgres', async () => {
      mockVerifyCloudinaryVideoAsset.mockRejectedValueOnce(
        new CloudinaryVideoVerificationError(
          'No se ha podido verificar el vídeo en Cloudinary.',
        ),
      )

      const result = await addCaseCarouselVideoAction(VALID_VIDEO_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'No se ha podido verificar el vídeo en Cloudinary.',
      })

      expect(mockAddCaseCarouselVideo).not.toHaveBeenCalled()
    })

    it('con datos inválidos no llega a verificar Cloudinary', async () => {
      const result = await addCaseCarouselVideoAction({
        ...VALID_VIDEO_INPUT,

        contentId: 'no-es-un-uuid',
      })

      expect(result.ok).toBe(false)

      expect(mockVerifyCloudinaryVideoAsset).not.toHaveBeenCalled()

      expect(mockAddCaseCarouselVideo).not.toHaveBeenCalled()
    })
  })

  describe('removeCaseCarouselMediaAction', () => {
    it('si Postgres y Cloudinary funcionan, elimina el medio', async () => {
      const result = await removeCaseCarouselMediaAction(VALID_REMOVE_INPUT)

      expect(result).toEqual({
        ok: true,
      })

      expect(mockRemoveCaseCarouselMedia).toHaveBeenCalledWith(
        VALID_REMOVE_INPUT,
      )

      expect(mockDeleteCloudinaryAsset).toHaveBeenCalledWith(
        VIDEO_PUBLIC_ID,
        'video',
      )
    })

    it('si Postgres falla, aborta antes de borrar en Cloudinary', async () => {
      mockRemoveCaseCarouselMedia.mockRejectedValueOnce(
        new Error('Este medio no pertenece a este caso'),
      )

      const result = await removeCaseCarouselMediaAction(VALID_REMOVE_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'Este medio no pertenece a este caso',
      })

      expect(mockDeleteCloudinaryAsset).not.toHaveBeenCalled()
    })

    it('si Cloudinary falla después de borrar en Postgres, devuelve warning', async () => {
      mockDeleteCloudinaryAsset.mockRejectedValueOnce(
        new Error('fallo Cloudinary'),
      )

      const result = await removeCaseCarouselMediaAction(VALID_REMOVE_INPUT)

      expect(result.ok).toBe(true)

      if (result.ok) {
        expect(result.warning).toContain('Cloudinary')
      }
    })
  })
})

describe('removeAllCaseCarouselMediaAction', () => {
  const ITEMS = [
    {
      mediaId: '33333333-3333-4333-8333-333333333331',
      kind: 'image' as const,
      cloudinaryPublicId: 'greener/content/a',
      sortOrder: 0,
      alt: 'a',
    },
    {
      mediaId: '33333333-3333-4333-8333-333333333332',
      kind: 'video' as const,
      cloudinaryPublicId: 'greener/content/videos/b',
      sortOrder: 1,
      alt: 'b',
    },
    {
      mediaId: '33333333-3333-4333-8333-333333333333',
      kind: 'image' as const,
      cloudinaryPublicId: 'greener/content/c',
      sortOrder: 2,
      alt: 'c',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(getCaseCarousel).mockResolvedValue(ITEMS)
    vi.mocked(removeCaseCarouselMedia).mockResolvedValue(MEDIA_ID)
    vi.mocked(deleteCloudinaryAsset).mockResolvedValue(undefined as never)
  })

  it('quita todas las diapositivas leídas en servidor y borra sus archivos', async () => {
    const result = await removeAllCaseCarouselMediaAction(CONTENT_ID)

    expect(result).toEqual({ ok: true })
    expect(removeCaseCarouselMedia).toHaveBeenCalledTimes(3)
    expect(removeCaseCarouselMedia).toHaveBeenNthCalledWith(2, {
      contentId: CONTENT_ID,
      mediaId: ITEMS[1].mediaId,
      cloudinaryPublicId: 'greener/content/videos/b',
      kind: 'video',
    })
    expect(deleteCloudinaryAsset).toHaveBeenCalledTimes(3)
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(
      'greener/content/videos/b',
      'video',
    )
  })

  it('si falla una, se detiene, informa y solo borra los archivos de las ya quitadas', async () => {
    vi.mocked(removeCaseCarouselMedia)
      .mockResolvedValueOnce(MEDIA_ID)
      .mockRejectedValueOnce(new Error('boom'))

    const result = await removeAllCaseCarouselMediaAction(CONTENT_ID)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error).toContain('Se han quitado 1 de 3 diapositivas')
    }

    expect(removeCaseCarouselMedia).toHaveBeenCalledTimes(2)
    expect(deleteCloudinaryAsset).toHaveBeenCalledTimes(1)
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(
      'greener/content/a',
      'image',
    )
  })

  it('si Cloudinary falla en algún archivo, devuelve aviso con el recuento', async () => {
    vi.mocked(deleteCloudinaryAsset)
      .mockRejectedValueOnce(new Error('cloudinary'))
      .mockResolvedValue(undefined as never)

    const result = await removeAllCaseCarouselMediaAction(CONTENT_ID)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.warning).toContain('1 archivo(s)')
    }
  })

  it('un caso sin diapositivas no hace nada', async () => {
    vi.mocked(getCaseCarousel).mockResolvedValue([])

    const result = await removeAllCaseCarouselMediaAction(CONTENT_ID)

    expect(result).toEqual({
      ok: false,
      error: 'Este caso no tiene diapositivas que quitar.',
    })
    expect(removeCaseCarouselMedia).not.toHaveBeenCalled()
  })

  it('rechaza un identificador que no es uuid y no lee nada', async () => {
    const result = await removeAllCaseCarouselMediaAction('nope')

    expect(result.ok).toBe(false)
    expect(getCaseCarousel).not.toHaveBeenCalled()
  })
})

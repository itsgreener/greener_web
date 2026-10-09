import { beforeEach, describe, expect, it, vi } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

const IMAGE_PUBLIC_ID = 'greener/content/test-image'

const VIDEO_PUBLIC_ID = 'greener/content/videos/test-video'

vi.mock('@/modules/media/application/warmAfterResponse', () => ({
  warmContentAfterResponse: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/media/application/registerCoverImage', () => ({
  registerCoverImage: vi.fn(),
}))

vi.mock('@/modules/media/application/registerCoverVideo', () => ({
  registerCoverVideo: vi.fn(),
}))

vi.mock('@/modules/media/application/deleteCoverMedia', () => ({
  deleteCoverMedia: vi.fn(),
}))

vi.mock('@/modules/media/application/cleanupMedia', () => ({
  snapshotMedia: vi.fn(),
  purgeRemovedMedia: vi.fn(),
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

import { warmContentAfterResponse } from '@/modules/media/application/warmAfterResponse'
import {
  registerCoverImageAction,
  registerCoverVideoAction,
  deleteCoverMediaAction,
} from '@/app/admin/contents/[id]/edit/mediaActions'

import { registerCoverImage } from '@/modules/media/application/registerCoverImage'

import { registerCoverVideo } from '@/modules/media/application/registerCoverVideo'

import { deleteCoverMedia } from '@/modules/media/application/deleteCoverMedia'

import {
  purgeRemovedMedia,
  snapshotMedia,
} from '@/modules/media/application/cleanupMedia'

import {
  CloudinaryImageVerificationError,
  CloudinaryVideoVerificationError,
  deleteCloudinaryAsset,
  verifyCloudinaryImageAsset,
  verifyCloudinaryVideoAsset,
} from '@/modules/media/infrastructure/cloudinaryServer'

const mockRegisterCoverImage = vi.mocked(registerCoverImage)

const mockRegisterCoverVideo = vi.mocked(registerCoverVideo)

const mockDeleteCoverMedia = vi.mocked(deleteCoverMedia)

const mockDeleteCloudinaryAsset = vi.mocked(deleteCloudinaryAsset)

const mockVerifyCloudinaryImageAsset = vi.mocked(verifyCloudinaryImageAsset)

const mockVerifyCloudinaryVideoAsset = vi.mocked(verifyCloudinaryVideoAsset)

const VALID_IMAGE_INPUT = {
  contentId: CONTENT_ID,

  cloudinaryPublicId: IMAGE_PUBLIC_ID,

  format: 'png',

  width: 10,

  height: 10,

  bytes: 10,

  ratio: '1:1',
}

const VALID_VIDEO_INPUT = {
  contentId: CONTENT_ID,

  cloudinaryPublicId: VIDEO_PUBLIC_ID,

  format: 'mp4',

  width: 10,

  height: 10,

  durationSeconds: 1,

  bytes: 10,

  ratio: '1:1',
}

const VALID_DELETE_INPUT = {
  contentId: CONTENT_ID,

  mediaId: MEDIA_ID,

  cloudinaryPublicId: IMAGE_PUBLIC_ID,

  kind: 'image' as const,
}

describe('mediaActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRegisterCoverImage.mockResolvedValue(MEDIA_ID)

    mockRegisterCoverVideo.mockResolvedValue(MEDIA_ID)

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

      durationSeconds: 12,

      bytes: 8192,
    }))
  })

  describe('registerCoverImageAction', () => {
    it('verifica Cloudinary y registra la imagen con los metadatos reales', async () => {
      const result = await registerCoverImageAction(VALID_IMAGE_INPUT)

      expect(result).toEqual({
        ok: true,

        mediaId: MEDIA_ID,
      })

      expect(mockVerifyCloudinaryImageAsset).toHaveBeenCalledWith(
        IMAGE_PUBLIC_ID,
      )

      expect(mockRegisterCoverImage).toHaveBeenCalledWith({
        contentId: CONTENT_ID,

        cloudinaryPublicId: IMAGE_PUBLIC_ID,

        format: 'webp',

        width: 2000,

        height: 1000,

        bytes: 4096,

        ratio: '1:1',
      })
    })

    it('no confía en los metadatos enviados por el navegador', async () => {
      await registerCoverImageAction({
        ...VALID_IMAGE_INPUT,

        format: 'png',

        width: 1,

        height: 1,

        bytes: 1,
      })

      expect(mockRegisterCoverImage).toHaveBeenCalledWith({
        contentId: CONTENT_ID,

        cloudinaryPublicId: IMAGE_PUBLIC_ID,

        format: 'webp',

        width: 2000,

        height: 1000,

        bytes: 4096,

        ratio: '1:1',
      })
    })

    it('si Cloudinary rechaza la imagen, no la registra en Postgres', async () => {
      mockVerifyCloudinaryImageAsset.mockRejectedValueOnce(
        new CloudinaryImageVerificationError(
          'No se permiten imágenes animadas.',
        ),
      )

      const result = await registerCoverImageAction(VALID_IMAGE_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'No se permiten imágenes animadas.',
      })

      expect(mockRegisterCoverImage).not.toHaveBeenCalled()
    })
  })

  describe('registerCoverVideoAction', () => {
    it('verifica Cloudinary y registra el vídeo con los metadatos reales', async () => {
      const result = await registerCoverVideoAction(VALID_VIDEO_INPUT)

      expect(result).toEqual({
        ok: true,

        mediaId: MEDIA_ID,
      })

      expect(mockVerifyCloudinaryVideoAsset).toHaveBeenCalledWith(
        VIDEO_PUBLIC_ID,
        1,
      )

      expect(warmContentAfterResponse).toHaveBeenCalledWith(CONTENT_ID)

      expect(mockRegisterCoverVideo).toHaveBeenCalledWith({
        contentId: CONTENT_ID,

        cloudinaryPublicId: VIDEO_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        durationSeconds: 12,

        bytes: 8192,

        ratio: '1:1',
      })
    })

    it('no confía en duration, tamaño ni dimensiones enviados por el navegador', async () => {
      await registerCoverVideoAction({
        ...VALID_VIDEO_INPUT,

        width: 1,

        height: 1,

        durationSeconds: 1,

        bytes: 1,
      })

      expect(mockRegisterCoverVideo).toHaveBeenCalledWith({
        contentId: CONTENT_ID,

        cloudinaryPublicId: VIDEO_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        durationSeconds: 12,

        bytes: 8192,

        ratio: '1:1',
      })
    })

    it('si Cloudinary rechaza el vídeo, no lo registra en Postgres', async () => {
      mockVerifyCloudinaryVideoAsset.mockRejectedValueOnce(
        new CloudinaryVideoVerificationError(
          'No se ha podido verificar el vídeo en Cloudinary.',
        ),
      )

      const result = await registerCoverVideoAction(VALID_VIDEO_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'No se ha podido verificar el vídeo en Cloudinary.',
      })

      expect(mockRegisterCoverVideo).not.toHaveBeenCalled()
    })

    it('con datos inválidos no llega a verificar Cloudinary', async () => {
      const result = await registerCoverVideoAction({
        ...VALID_VIDEO_INPUT,

        contentId: 'no-es-un-uuid',
      })

      expect(result.ok).toBe(false)

      expect(mockVerifyCloudinaryVideoAsset).not.toHaveBeenCalled()

      expect(mockRegisterCoverVideo).not.toHaveBeenCalled()
    })
  })

  describe('deleteCoverMediaAction', () => {
    const SERVER_REF = {
      mediaId: MEDIA_ID,
      cloudinaryPublicId: IMAGE_PUBLIC_ID,
      kind: 'image' as const,
    }

    const mockSnapshotMedia = vi.mocked(snapshotMedia)
    const mockPurgeRemovedMedia = vi.mocked(purgeRemovedMedia)

    beforeEach(() => {
      mockSnapshotMedia.mockResolvedValue([SERVER_REF])
      mockPurgeRemovedMedia.mockResolvedValue({ purged: 1, failed: 0 })
    })

    it('con datos inválidos, no llega a llamar ni a Postgres ni a Cloudinary', async () => {
      const result = await deleteCoverMediaAction({
        contentId: 'no-es-uuid',
      })

      expect(result.ok).toBe(false)

      expect(mockDeleteCoverMedia).not.toHaveBeenCalled()

      expect(mockPurgeRemovedMedia).not.toHaveBeenCalled()
    })

    it('si Postgres tiene éxito y Cloudinary también, devuelve ok sin warning', async () => {
      const result = await deleteCoverMediaAction(VALID_DELETE_INPUT)

      expect(result).toEqual({
        ok: true,
      })

      expect(mockDeleteCoverMedia).toHaveBeenCalledWith(VALID_DELETE_INPUT)

      expect(mockSnapshotMedia).toHaveBeenCalledWith([MEDIA_ID])

      expect(mockPurgeRemovedMedia).toHaveBeenCalledWith([SERVER_REF])
    })

    it('borra el archivo que dice Postgres, nunca el public id que manda el navegador', async () => {
      await deleteCoverMediaAction({
        ...VALID_DELETE_INPUT,
        cloudinaryPublicId: 'otra-cuenta/archivo-ajeno',
      })

      expect(mockPurgeRemovedMedia).toHaveBeenCalledWith([SERVER_REF])

      expect(mockDeleteCloudinaryAsset).not.toHaveBeenCalled()
    })

    it('si Postgres falla porque el medio ya no coincide con el contenido, aborta sin llamar a Cloudinary', async () => {
      mockDeleteCoverMedia.mockRejectedValueOnce(
        new Error(
          'El contenido ya no apunta a este medio (posible carrera con otra pestaña)',
        ),
      )

      const result = await deleteCoverMediaAction(VALID_DELETE_INPUT)

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error).toContain('otra pestaña')
      }

      expect(mockPurgeRemovedMedia).not.toHaveBeenCalled()
    })

    it('si Postgres falla por violación de FK, aborta y no borra en Cloudinary', async () => {
      const fkError = Object.assign(
        new Error('update or delete violates foreign key constraint'),
        {
          code: '23503',
        },
      )

      mockDeleteCoverMedia.mockRejectedValueOnce(fkError)

      const result = await deleteCoverMediaAction(VALID_DELETE_INPUT)

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error).toContain('se sigue usando en otro sitio')
      }

      expect(mockPurgeRemovedMedia).not.toHaveBeenCalled()
    })

    it('si Postgres tiene éxito pero Cloudinary falla, devuelve ok con warning', async () => {
      mockPurgeRemovedMedia.mockResolvedValueOnce({ purged: 0, failed: 1 })

      const result = await deleteCoverMediaAction(VALID_DELETE_INPUT)

      expect(result.ok).toBe(true)

      if (result.ok) {
        expect(result.warning).toContain('Cloudinary')
      }
    })
  })
})

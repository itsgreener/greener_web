import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/pin/application/createPin', () => ({
  createPin: vi.fn(),
}))

vi.mock('@/modules/pin/application/updatePin', () => ({
  updatePin: vi.fn(),
}))

vi.mock('@/modules/pin/application/deletePin', () => ({
  deletePin: vi.fn(),
}))

vi.mock('@/modules/pin/application/attachPinImage', () => ({
  attachPinImage: vi.fn(),
}))

vi.mock('@/modules/pin/application/attachPinVideo', () => ({
  attachPinVideo: vi.fn(),
}))

vi.mock('@/modules/pin/application/detachPinMedia', () => ({
  detachPinMedia: vi.fn(),
}))

vi.mock('@/modules/media/application/cleanupMedia', () => ({
  snapshotPinMedia: vi.fn(),
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

import {
  createPinAction,
  updatePinAction,
  deletePinAction,
  createPinWithImageAction,
  createPinWithVideoAction,
  attachPinImageAction,
  attachPinVideoAction,
  detachPinMediaAction,
} from '@/app/admin/contents/[id]/edit/pinActions'

import { createPin } from '@/modules/pin/application/createPin'

import { updatePin } from '@/modules/pin/application/updatePin'

import { deletePin } from '@/modules/pin/application/deletePin'

import { attachPinImage } from '@/modules/pin/application/attachPinImage'

import { attachPinVideo } from '@/modules/pin/application/attachPinVideo'

import { detachPinMedia } from '@/modules/pin/application/detachPinMedia'

import {
  purgeRemovedMedia,
  snapshotPinMedia,
} from '@/modules/media/application/cleanupMedia'

import {
  CloudinaryImageVerificationError,
  CloudinaryVideoVerificationError,
  deleteCloudinaryAsset,
  verifyCloudinaryImageAsset,
  verifyCloudinaryVideoAsset,
} from '@/modules/media/infrastructure/cloudinaryServer'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

const PIN_ID = '22222222-2222-4222-8222-222222222222'

const MEDIA_ID = '33333333-3333-4333-8333-333333333333'

const CLOUDINARY_PUBLIC_ID = 'greener/content/test-image'

const VIDEO_CLOUDINARY_PUBLIC_ID = 'greener/content/videos/test-video'

const mockCreatePin = vi.mocked(createPin)

const mockUpdatePin = vi.mocked(updatePin)

const mockDeletePin = vi.mocked(deletePin)

const mockAttachPinImage = vi.mocked(attachPinImage)

const mockAttachPinVideo = vi.mocked(attachPinVideo)

const mockDetachPinMedia = vi.mocked(detachPinMedia)

const mockDeleteCloudinaryAsset = vi.mocked(deleteCloudinaryAsset)

const mockSnapshotPinMedia = vi.mocked(snapshotPinMedia)

const mockPurgeRemovedMedia = vi.mocked(purgeRemovedMedia)

const PIN_MEDIA_REFS = [
  {
    mediaId: MEDIA_ID,
    cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,
    kind: 'video' as const,
  },
]

const mockVerifyCloudinaryImageAsset = vi.mocked(verifyCloudinaryImageAsset)

const mockVerifyCloudinaryVideoAsset = vi.mocked(verifyCloudinaryVideoAsset)

function createValidFormData() {
  const formData = new FormData()

  formData.set('ratio', '1:1')

  formData.set('showAsCarousel', 'false')

  formData.set('label', 'Pin de prueba')

  formData.set('language', 'es')

  formData.set('autoplayMode', '')

  formData.set('speedMs', '')

  formData.set('queueOrder', '0')

  formData.set('alt', 'Texto alternativo')

  return formData
}

const VALID_PIN_INPUT = {
  contentId: CONTENT_ID,

  ratio: '1:1',

  showAsCarousel: false,

  label: 'Pin de prueba',

  language: 'es',

  autoplayMode: null,

  speedMs: null,

  queueOrder: 0,

  alt: 'Texto alternativo',
}

const VALID_IMAGE_INPUT = {
  pinId: PIN_ID,

  cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,

  format: 'jpg',

  width: 1200,

  height: 800,

  bytes: 1024,

  slideOrder: 0,
}

const VALID_VIDEO_INPUT = {
  pinId: PIN_ID,

  cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,

  format: 'mp4',

  width: 1200,

  height: 800,

  durationSeconds: 3,

  bytes: 1024,

  slideOrder: 0,
}

const VALID_PIN_WITH_IMAGE = {
  ...VALID_PIN_INPUT,

  cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,

  format: 'jpg',

  width: 1200,

  height: 800,

  bytes: 1024,
}

describe('pinActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCreatePin.mockResolvedValue(PIN_ID)

    mockUpdatePin.mockResolvedValue(PIN_ID)

    mockDeletePin.mockResolvedValue(PIN_ID)

    mockAttachPinImage.mockResolvedValue(MEDIA_ID)

    mockAttachPinVideo.mockResolvedValue(MEDIA_ID)

    mockDetachPinMedia.mockResolvedValue(MEDIA_ID)

    mockDeleteCloudinaryAsset.mockResolvedValue(undefined)

    mockSnapshotPinMedia.mockResolvedValue(PIN_MEDIA_REFS)

    mockPurgeRemovedMedia.mockResolvedValue({ purged: 1, failed: 0 })

    mockVerifyCloudinaryImageAsset.mockImplementation(async (publicId) => ({
      cloudinaryPublicId: publicId,

      format: 'jpg',

      width: 1200,

      height: 800,

      bytes: 1024,
    }))

    mockVerifyCloudinaryVideoAsset.mockImplementation(async (publicId) => ({
      cloudinaryPublicId: publicId,

      format: 'mp4',

      width: 1920,

      height: 1080,

      durationSeconds: 3,

      bytes: 4096,
    }))
  })

  describe('createPinAction', () => {
    it('con datos válidos, crea y devuelve success', async () => {
      const result = await createPinAction(
        CONTENT_ID,
        {},
        createValidFormData(),
      )

      expect(result).toEqual({
        success: true,
      })

      expect(mockCreatePin).toHaveBeenCalledTimes(1)
    })

    it('con alt vacío, no llega a llamar a createPin', async () => {
      const formData = createValidFormData()

      formData.set('alt', '')

      const result = await createPinAction(CONTENT_ID, {}, formData)

      expect(result.fieldErrors).toBeDefined()

      expect(mockCreatePin).not.toHaveBeenCalled()
    })
  })

  describe('updatePinAction', () => {
    it('con datos válidos, actualiza y devuelve success', async () => {
      const result = await updatePinAction(
        PIN_ID,
        CONTENT_ID,
        {},
        createValidFormData(),
      )

      expect(result).toEqual({
        success: true,
      })

      expect(mockUpdatePin).toHaveBeenCalledTimes(1)
    })

    it('con queueOrder negativo, no llega a llamar a updatePin', async () => {
      const formData = createValidFormData()

      formData.set('queueOrder', '-1')

      const result = await updatePinAction(PIN_ID, CONTENT_ID, {}, formData)

      expect(result.fieldErrors).toBeDefined()

      expect(mockUpdatePin).not.toHaveBeenCalled()
    })
  })

  describe('deletePinAction', () => {
    it('con un id válido, borra y devuelve success', async () => {
      const result = await deletePinAction(PIN_ID, CONTENT_ID)

      expect(result).toEqual({
        success: true,
      })

      expect(mockDeletePin).toHaveBeenCalledTimes(1)
    })

    it('lee los medios del pin ANTES de borrarlo y purga sus archivos de Cloudinary DESPUÉS', async () => {
      const order: string[] = []

      mockSnapshotPinMedia.mockImplementationOnce(async () => {
        order.push('snapshot')

        return PIN_MEDIA_REFS
      })

      mockDeletePin.mockImplementationOnce(async () => {
        order.push('delete')

        return PIN_ID
      })

      mockPurgeRemovedMedia.mockImplementationOnce(async () => {
        order.push('purge')

        return { purged: 1, failed: 0 }
      })

      await deletePinAction(PIN_ID, CONTENT_ID)

      expect(order).toEqual(['snapshot', 'delete', 'purge'])

      expect(mockSnapshotPinMedia).toHaveBeenCalledWith(PIN_ID)

      expect(mockPurgeRemovedMedia).toHaveBeenCalledWith(PIN_MEDIA_REFS)
    })

    it('si el borrado en Postgres falla, NO borra nada en Cloudinary', async () => {
      mockDeletePin.mockRejectedValueOnce(new Error('boom'))

      const result = await deletePinAction(PIN_ID, CONTENT_ID)

      expect(result.formError).toBe('No se ha podido borrar el pin.')

      expect(mockPurgeRemovedMedia).not.toHaveBeenCalled()
    })

    it('si Cloudinary no puede borrar algún archivo, el pin se da por borrado y se devuelve un aviso', async () => {
      mockPurgeRemovedMedia.mockResolvedValueOnce({ purged: 0, failed: 2 })

      const result = await deletePinAction(PIN_ID, CONTENT_ID)

      expect(result.success).toBe(true)

      expect(result.formError).toBeUndefined()

      expect(result.warning).toContain('2 archivo(s)')
    })
  })

  describe('createPinWithVideoAction (carga masiva con vídeo, 5 oct 2026)', () => {
    const VALID_PIN_WITH_VIDEO = {
      ...VALID_PIN_INPUT,

      cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,

      format: 'mp4',

      width: 1920,

      height: 1080,

      durationSeconds: 5,

      bytes: 1024,
    }

    it('verifica el vídeo, crea el pin y lo adjunta, y devuelve ambos ids', async () => {
      const result = await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)

      expect(result).toEqual({ ok: true, pinId: PIN_ID, mediaId: MEDIA_ID })

      expect(mockVerifyCloudinaryVideoAsset).toHaveBeenCalledWith(
        VIDEO_CLOUDINARY_PUBLIC_ID,
      )

      expect(mockCreatePin).toHaveBeenCalledTimes(1)

      expect(mockAttachPinVideo).toHaveBeenCalledWith(
        expect.objectContaining({ pinId: PIN_ID, slideOrder: 0 }),
      )

      expect(mockDeletePin).not.toHaveBeenCalled()
    })

    it('verifica el vídeo ANTES de crear el pin: si Cloudinary lo rechaza, no queda ningún pin', async () => {
      mockVerifyCloudinaryVideoAsset.mockRejectedValueOnce(
        new CloudinaryVideoVerificationError(
          'El vídeo no existe en Cloudinary.',
        ),
      )

      const result = await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)

      expect(result).toEqual({
        ok: false,
        error: 'El vídeo no existe en Cloudinary.',
      })

      expect(mockCreatePin).not.toHaveBeenCalled()
    })

    it('datos de vídeo inválidos (más de 15 s): se rechaza sin crear el pin', async () => {
      const result = await createPinWithVideoAction({
        ...VALID_PIN_WITH_VIDEO,
        durationSeconds: 16,
      })

      expect(result).toEqual({
        ok: false,
        error: 'Los datos del vídeo no son válidos.',
      })

      expect(mockCreatePin).not.toHaveBeenCalled()

      expect(mockVerifyCloudinaryVideoAsset).not.toHaveBeenCalled()
    })

    it('datos de pin inválidos (sin alt): se rechaza sin tocar Cloudinary ni crear nada', async () => {
      const result = await createPinWithVideoAction({
        ...VALID_PIN_WITH_VIDEO,
        alt: '',
      })

      expect(result.ok).toBe(false)

      expect(mockVerifyCloudinaryVideoAsset).not.toHaveBeenCalled()

      expect(mockCreatePin).not.toHaveBeenCalled()
    })

    it('si el SQL rechaza el vídeo (límite por tipo de contenido), BORRA el pin recién creado y explica el límite', async () => {
      mockAttachPinVideo.mockRejectedValueOnce(
        new Error('Animation is too long'),
      )

      const result = await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)

      expect(result).toEqual({
        ok: false,
        error:
          'El vídeo supera la duración máxima de un pin (8 s; 15 s en las tools).',
      })

      expect(mockDeletePin).toHaveBeenCalledWith({ id: PIN_ID })
    })

    it('si además falla el borrado del pin, devuelve igualmente el error original', async () => {
      mockAttachPinVideo.mockRejectedValueOnce(new Error('Video is too large'))

      mockDeletePin.mockRejectedValueOnce(new Error('db caída'))

      const result = await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)

      expect(result.ok).toBe(false)

      expect(result.ok === false && result.error).toContain('peso máximo')
    })

    it('si no se puede crear el pin, devuelve el error y no adjunta nada', async () => {
      mockCreatePin.mockRejectedValueOnce(new Error('db down'))

      const result = await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)

      expect(result).toEqual({
        ok: false,
        error: 'No se ha podido crear el pin.',
      })

      expect(mockAttachPinVideo).not.toHaveBeenCalled()
    })

    it('si la Admin API no devolvió duración (parche ?? 10), usa la real que dio Cloudinary al navegador', async () => {
      mockVerifyCloudinaryVideoAsset.mockResolvedValueOnce({
        cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        durationSeconds: 10,

        bytes: 4096,

        durationAssumed: true,
      })

      await createPinWithVideoAction({
        ...VALID_PIN_WITH_VIDEO,
        durationSeconds: 6.4,
      })

      expect(mockAttachPinVideo).toHaveBeenCalledWith(
        expect.objectContaining({ durationSeconds: 7 }),
      )

      expect(mockAttachPinVideo.mock.calls[0][0]).not.toHaveProperty(
        'durationAssumed',
      )
    })
  })

  describe('createPinWithImageAction', () => {
    it('con datos válidos, crea el pin y adjunta la imagen', async () => {
      const result = await createPinWithImageAction(VALID_PIN_WITH_IMAGE)

      expect(result).toEqual({
        ok: true,

        pinId: PIN_ID,

        mediaId: MEDIA_ID,
      })

      expect(mockCreatePin).toHaveBeenCalledTimes(1)

      expect(mockVerifyCloudinaryImageAsset).toHaveBeenCalledWith(
        CLOUDINARY_PUBLIC_ID,
      )

      expect(mockAttachPinImage).toHaveBeenCalledWith({
        pinId: PIN_ID,

        cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,

        format: 'jpg',

        width: 1200,

        height: 800,

        bytes: 1024,

        slideOrder: 0,
      })
    })

    it('con datos de pin inválidos, no llega a llamar a createPin', async () => {
      const result = await createPinWithImageAction({
        ...VALID_PIN_WITH_IMAGE,

        alt: '',
      })

      expect(result.ok).toBe(false)

      expect(mockCreatePin).not.toHaveBeenCalled()

      expect(mockVerifyCloudinaryImageAsset).not.toHaveBeenCalled()

      expect(mockAttachPinImage).not.toHaveBeenCalled()
    })

    it('si createPin falla, no llega a llamar a attachPinImage', async () => {
      mockCreatePin.mockRejectedValueOnce(new Error('db down'))

      const result = await createPinWithImageAction(VALID_PIN_WITH_IMAGE)

      expect(result.ok).toBe(false)

      expect(mockVerifyCloudinaryImageAsset).not.toHaveBeenCalled()

      expect(mockAttachPinImage).not.toHaveBeenCalled()
    })

    it('si el pin se crea pero adjuntar la imagen falla, informa el pinId — el pin no se pierde', async () => {
      mockAttachPinImage.mockRejectedValueOnce(new Error('fallo al adjuntar'))

      const result = await createPinWithImageAction(VALID_PIN_WITH_IMAGE)

      expect(result).toEqual({
        ok: false,

        pinId: PIN_ID,

        error: 'fallo al adjuntar',
      })
    })

    it('si Cloudinary rechaza la imagen, no la registra en Postgres', async () => {
      mockVerifyCloudinaryImageAsset.mockRejectedValueOnce(
        new CloudinaryImageVerificationError('No se permiten archivos GIF.'),
      )

      const result = await createPinWithImageAction(VALID_PIN_WITH_IMAGE)

      expect(result).toEqual({
        ok: false,

        pinId: PIN_ID,

        error: 'No se permiten archivos GIF.',
      })

      expect(mockAttachPinImage).not.toHaveBeenCalled()
    })
  })

  describe('attachPinImageAction', () => {
    it('con datos válidos, verifica Cloudinary, adjunta y devuelve ok', async () => {
      const result = await attachPinImageAction(VALID_IMAGE_INPUT)

      expect(result).toEqual({
        ok: true,

        mediaId: MEDIA_ID,
      })

      expect(mockVerifyCloudinaryImageAsset).toHaveBeenCalledWith(
        CLOUDINARY_PUBLIC_ID,
      )

      expect(mockAttachPinImage).toHaveBeenCalledWith({
        pinId: PIN_ID,

        cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,

        format: 'jpg',

        width: 1200,

        height: 800,

        bytes: 1024,

        slideOrder: 0,
      })
    })

    it('usa los metadatos verificados de Cloudinary en vez de confiar en los enviados por cliente', async () => {
      mockVerifyCloudinaryImageAsset.mockResolvedValueOnce({
        cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,

        format: 'webp',

        width: 2000,

        height: 1000,

        bytes: 4096,
      })

      const result = await attachPinImageAction({
        ...VALID_IMAGE_INPUT,

        format: 'png',

        width: 10,

        height: 10,

        bytes: 10,
      })

      expect(result.ok).toBe(true)

      expect(mockAttachPinImage).toHaveBeenCalledWith({
        pinId: PIN_ID,

        cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,

        format: 'webp',

        width: 2000,

        height: 1000,

        bytes: 4096,

        slideOrder: 0,
      })
    })

    it('traduce el error de límite de 8 medios al mensaje del dominio', async () => {
      mockAttachPinImage.mockRejectedValueOnce(
        new Error('Este pin admite hasta 8 medios'),
      )

      const result = await attachPinImageAction(VALID_IMAGE_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'Este pin admite hasta 8 medios',
      })
    })

    it('con datos inválidos, no llega a verificar Cloudinary ni a attachPinImage', async () => {
      const result = await attachPinImageAction({
        ...VALID_IMAGE_INPUT,

        pinId: 'no-es-un-uuid',
      })

      expect(result.ok).toBe(false)

      expect(mockVerifyCloudinaryImageAsset).not.toHaveBeenCalled()

      expect(mockAttachPinImage).not.toHaveBeenCalled()
    })

    it('si la verificación de Cloudinary falla, devuelve el mensaje y no registra la imagen', async () => {
      mockVerifyCloudinaryImageAsset.mockRejectedValueOnce(
        new CloudinaryImageVerificationError(
          'No se permiten imágenes animadas.',
        ),
      )

      const result = await attachPinImageAction(VALID_IMAGE_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'No se permiten imágenes animadas.',
      })

      expect(mockAttachPinImage).not.toHaveBeenCalled()
    })
  })

  describe('attachPinVideoAction', () => {
    it('con datos válidos, verifica Cloudinary, adjunta y devuelve ok', async () => {
      const result = await attachPinVideoAction(VALID_VIDEO_INPUT)

      expect(result).toEqual({
        ok: true,

        mediaId: MEDIA_ID,
      })

      expect(mockVerifyCloudinaryVideoAsset).toHaveBeenCalledWith(
        VIDEO_CLOUDINARY_PUBLIC_ID,
      )

      expect(mockAttachPinVideo).toHaveBeenCalledWith({
        pinId: PIN_ID,

        cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        durationSeconds: 3,

        bytes: 4096,

        slideOrder: 0,
      })
    })

    it('si la Admin API no devolvió duración (parche ?? 10), usa la duración REAL que Cloudinary dio al navegador, no el 10 supuesto', async () => {
      mockVerifyCloudinaryVideoAsset.mockResolvedValueOnce({
        cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        durationSeconds: 10,

        bytes: 4096,

        durationAssumed: true,
      })

      await attachPinVideoAction({
        ...VALID_VIDEO_INPUT,

        durationSeconds: 6.4,
      })

      expect(mockAttachPinVideo).toHaveBeenCalledWith(
        expect.objectContaining({ durationSeconds: 7 }),
      )

      // La bandera es interna: no se propaga al caso de uso.
      expect(mockAttachPinVideo.mock.calls[0][0]).not.toHaveProperty(
        'durationAssumed',
      )
    })

    it('si la duración sí viene de Cloudinary, manda la verificada, no la del navegador', async () => {
      mockVerifyCloudinaryVideoAsset.mockResolvedValueOnce({
        cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        durationSeconds: 4,

        bytes: 4096,

        durationAssumed: false,
      })

      await attachPinVideoAction({
        ...VALID_VIDEO_INPUT,

        durationSeconds: 1,
      })

      expect(mockAttachPinVideo).toHaveBeenCalledWith(
        expect.objectContaining({ durationSeconds: 4 }),
      )
    })

    it('usa los metadatos verificados de Cloudinary en vez de confiar en los enviados por cliente', async () => {
      mockVerifyCloudinaryVideoAsset.mockResolvedValueOnce({
        cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,

        format: 'webm',

        width: 2560,

        height: 1440,

        durationSeconds: 4,

        bytes: 8192,
      })

      const result = await attachPinVideoAction({
        ...VALID_VIDEO_INPUT,

        format: 'mp4',

        width: 10,

        height: 10,

        durationSeconds: 1,

        bytes: 10,
      })

      expect(result.ok).toBe(true)

      expect(mockAttachPinVideo).toHaveBeenCalledWith({
        pinId: PIN_ID,

        cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,

        format: 'webm',

        width: 2560,

        height: 1440,

        durationSeconds: 4,

        bytes: 8192,

        slideOrder: 0,
      })
    })

    it('si la verificación de Cloudinary falla, devuelve el mensaje y no registra el vídeo', async () => {
      mockVerifyCloudinaryVideoAsset.mockRejectedValueOnce(
        new CloudinaryVideoVerificationError(
          'No se ha podido verificar el vídeo en Cloudinary.',
        ),
      )

      const result = await attachPinVideoAction(VALID_VIDEO_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'No se ha podido verificar el vídeo en Cloudinary.',
      })

      expect(mockAttachPinVideo).not.toHaveBeenCalled()
    })

    it('traduce el error de duración a un mensaje legible', async () => {
      mockAttachPinVideo.mockRejectedValueOnce(
        new Error('Animation is too long'),
      )

      const result = await attachPinVideoAction(VALID_VIDEO_INPUT)

      expect(result).toEqual({
        ok: false,

        error:
          'El vídeo supera la duración máxima de un pin (8 s; 15 s en las tools).',
      })
    })
  })

  describe('detachPinMediaAction', () => {
    const VALID_DETACH_INPUT = {
      pinId: PIN_ID,

      mediaId: MEDIA_ID,

      cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,

      kind: 'image',
    }

    it('si Postgres y Cloudinary van bien, devuelve ok sin warning', async () => {
      const result = await detachPinMediaAction(VALID_DETACH_INPUT)

      expect(result).toEqual({
        ok: true,
      })

      expect(mockDetachPinMedia).toHaveBeenCalledTimes(1)

      expect(mockDeleteCloudinaryAsset).toHaveBeenCalledWith(
        CLOUDINARY_PUBLIC_ID,
        'image',
      )
    })

    it('si Postgres falla, aborta sin llamar a Cloudinary', async () => {
      mockDetachPinMedia.mockRejectedValueOnce(
        new Error('Este medio no pertenece a este pin'),
      )

      const result = await detachPinMediaAction(VALID_DETACH_INPUT)

      expect(result).toEqual({
        ok: false,

        error: 'Este medio no pertenece a este pin',
      })

      expect(mockDeleteCloudinaryAsset).not.toHaveBeenCalled()
    })

    it('si Postgres va bien pero Cloudinary falla, devuelve ok con warning', async () => {
      mockDeleteCloudinaryAsset.mockRejectedValueOnce(new Error('fallo'))

      const result = await detachPinMediaAction(VALID_DETACH_INPUT)

      expect(result.ok).toBe(true)

      if (result.ok) {
        expect(result.warning).toContain('Cloudinary')
      }
    })
  })
})

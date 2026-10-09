import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCloudinaryConfig, mockApiSignRequest, mockResource, mockDestroy } =
  vi.hoisted(() => ({
    mockCloudinaryConfig: vi.fn(),

    mockApiSignRequest: vi.fn(),

    mockResource: vi.fn(),

    mockDestroy: vi.fn(),
  }))

vi.mock('cloudinary', () => ({
  v2: {
    config: mockCloudinaryConfig,

    utils: {
      api_sign_request: mockApiSignRequest,
    },

    api: {
      resource: mockResource,
    },

    uploader: {
      destroy: mockDestroy,
    },
  },
}))

vi.mock('@/lib/serverEnv', () => ({
  getCloudinaryEnv: () => ({
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'test-cloud',

    CLOUDINARY_API_KEY: 'test-api-key',

    CLOUDINARY_API_SECRET: 'test-api-secret',
  }),
}))

vi.mock('@/modules/media/domain/mediaLimits', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/modules/media/domain/mediaLimits')>()

  return {
    ...actual,

    validateImageFile: vi.fn(),

    validateVideoUpload: vi.fn(),
  }
})

import {
  validateImageFile,
  validateVideoUpload,
} from '@/modules/media/domain/mediaLimits'

import {
  CloudinaryImageVerificationError,
  CloudinaryVideoVerificationError,
  createSignedImageUpload,
  createSignedVideoUpload,
  deleteCloudinaryAsset,
  verifyCloudinaryImageAsset,
  verifyCloudinaryVideoAsset,
} from '@/modules/media/infrastructure/cloudinaryServer'

const mockValidateImageFile = vi.mocked(validateImageFile)

const mockValidateVideoUpload = vi.mocked(validateVideoUpload)

const IMAGE_PUBLIC_ID = 'greener/content/test-image'

const VIDEO_PUBLIC_ID = 'greener/content/videos/test-video'

const IMAGE_URL = 'https://res.cloudinary.com/test/image/upload/test-image.jpg'

function validImageResource() {
  return {
    public_id: IMAGE_PUBLIC_ID,

    resource_type: 'image',

    format: 'jpg',

    width: 1920,

    height: 1080,

    bytes: 4096,

    secure_url: IMAGE_URL,
  }
}

function validVideoResource() {
  return {
    public_id: VIDEO_PUBLIC_ID,

    resource_type: 'video',

    format: 'mp4',

    width: 1920,

    height: 1080,

    duration: 42.5,

    bytes: 8192,
  }
}

function successfulImageFetch() {
  return {
    ok: true,

    arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer,
  }
}

describe('cloudinaryServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockApiSignRequest.mockReturnValue('test-signature')

    mockValidateImageFile.mockResolvedValue(null)

    mockValidateVideoUpload.mockReturnValue(null)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(successfulImageFetch()))
  })

  describe('createSignedImageUpload', () => {
    it('firma una subida en el directorio de imágenes permitido', () => {
      const result = createSignedImageUpload()

      expect(result.folder).toBe('greener/content')

      expect(result.apiKey).toBe('test-api-key')

      expect(result.cloudName).toBe('test-cloud')

      expect(result.signature).toBe('test-signature')

      expect(mockApiSignRequest).toHaveBeenCalledWith(
        {
          timestamp: expect.any(Number),

          folder: 'greener/content',
        },
        'test-api-secret',
      )
    })
  })

  describe('createSignedVideoUpload', () => {
    it('firma una subida en el directorio de vídeos permitido', () => {
      const result = createSignedVideoUpload()

      expect(result.folder).toBe('greener/content/videos')

      expect(mockApiSignRequest).toHaveBeenCalledWith(
        {
          timestamp: expect.any(Number),

          folder: 'greener/content/videos',
        },
        'test-api-secret',
      )
    })
  })

  describe('verifyCloudinaryImageAsset', () => {
    it('consulta Cloudinary, valida el original y devuelve los metadatos reales', async () => {
      mockResource.mockResolvedValueOnce(validImageResource())

      const result = await verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)

      expect(mockResource).toHaveBeenCalledWith(IMAGE_PUBLIC_ID, {
        resource_type: 'image',

        type: 'upload',
      })

      expect(fetch).toHaveBeenCalledWith(IMAGE_URL, {
        cache: 'no-store',
      })

      expect(mockValidateImageFile).toHaveBeenCalledTimes(1)

      expect(result).toEqual({
        cloudinaryPublicId: IMAGE_PUBLIC_ID,

        format: 'jpg',

        width: 1920,

        height: 1080,

        bytes: 4096,
      })
    })

    it('rechaza un publicId fuera del directorio permitido', async () => {
      await expect(
        verifyCloudinaryImageAsset('otro-directorio/test-image'),
      ).rejects.toThrow(
        'La imagen no pertenece al directorio permitido de Cloudinary.',
      )

      expect(mockResource).not.toHaveBeenCalled()
    })

    it('rechaza como imagen un asset del directorio de vídeos', async () => {
      await expect(verifyCloudinaryImageAsset(VIDEO_PUBLIC_ID)).rejects.toThrow(
        CloudinaryImageVerificationError,
      )

      expect(mockResource).not.toHaveBeenCalled()
    })

    it('si la Admin API de Cloudinary falla, devuelve un error de verificación', async () => {
      mockResource.mockRejectedValueOnce(new Error('Cloudinary API down'))

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'No se ha podido verificar la imagen en Cloudinary.',
      )
    })

    it('rechaza metadatos incompletos devueltos por Cloudinary', async () => {
      mockResource.mockResolvedValueOnce({
        public_id: IMAGE_PUBLIC_ID,

        format: 'jpg',

        width: 1920,
      })

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'Cloudinary ha devuelto datos incompletos para la imagen.',
      )
    })

    it('rechaza un recurso cuyo public_id no coincide con el solicitado', async () => {
      mockResource.mockResolvedValueOnce({
        ...validImageResource(),

        public_id: 'greener/content/otra-imagen',
      })

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        CloudinaryImageVerificationError,
      )
    })

    it('rechaza un recurso que Cloudinary identifica como vídeo', async () => {
      mockResource.mockResolvedValueOnce({
        ...validImageResource(),

        resource_type: 'video',
      })

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'El recurso de Cloudinary no es una imagen.',
      )
    })

    it('rechaza GIF aunque Cloudinary lo presente como imagen', async () => {
      mockResource.mockResolvedValueOnce({
        ...validImageResource(),

        format: 'gif',
      })

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'No se permiten archivos GIF.',
      )

      expect(fetch).not.toHaveBeenCalled()
    })

    it('rechaza formatos de imagen fuera de la lista permitida', async () => {
      mockResource.mockResolvedValueOnce({
        ...validImageResource(),

        format: 'bmp',
      })

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'Formato de imagen no permitido.',
      )

      expect(fetch).not.toHaveBeenCalled()
    })

    it('si no puede descargar el original, rechaza la imagen', async () => {
      mockResource.mockResolvedValueOnce(validImageResource())

      vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'))

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'No se ha podido descargar la imagen original para verificarla.',
      )
    })

    it('si Cloudinary responde HTTP no OK al descargar, rechaza la imagen', async () => {
      mockResource.mockResolvedValueOnce(validImageResource())

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,

        arrayBuffer: async () => new ArrayBuffer(0),
      } as Response)

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'No se ha podido descargar la imagen original para verificarla.',
      )
    })

    it('rechaza una imagen que la validación binaria detecta como animada', async () => {
      mockResource.mockResolvedValueOnce(validImageResource())

      mockValidateImageFile.mockResolvedValueOnce({
        code: 'ANIMATED_IMAGE_NOT_ALLOWED',

        format: 'webp',
      })

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'No se permiten imágenes animadas.',
      )
    })

    it('rechaza una imagen si la validación binaria detecta un GIF renombrado', async () => {
      mockResource.mockResolvedValueOnce(validImageResource())

      mockValidateImageFile.mockResolvedValueOnce({
        code: 'GIF_NOT_ALLOWED',
      })

      await expect(verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)).rejects.toThrow(
        'No se permiten archivos GIF.',
      )
    })

    it('usa el mayor tamaño entre metadata de Cloudinary y binario descargado', async () => {
      mockResource.mockResolvedValueOnce({
        ...validImageResource(),

        bytes: 2,
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,

        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4, 5, 6]).buffer,
      } as Response)

      await verifyCloudinaryImageAsset(IMAGE_PUBLIC_ID)

      expect(mockValidateImageFile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'cloudinary.jpg',

          type: 'image/jpeg',

          size: 6,
        }),
      )
    })
  })

  describe('verifyCloudinaryVideoAsset', () => {
    it('consulta Cloudinary y devuelve los metadatos reales del vídeo', async () => {
      mockResource.mockResolvedValueOnce(validVideoResource())

      const result = await verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)

      expect(mockResource).toHaveBeenCalledWith(VIDEO_PUBLIC_ID, {
        resource_type: 'video',

        type: 'upload',

        // Candidato a solución de la falta de `duration` (5 oct 2026).
        image_metadata: true,
      })

      expect(mockValidateVideoUpload).toHaveBeenCalledWith(8192, 42.5)

      expect(result).toEqual({
        cloudinaryPublicId: VIDEO_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        durationSeconds: 42.5,

        bytes: 8192,
      })
    })

    it('si la Admin API no devuelve la duración, usa la que dio Cloudinary al navegador', async () => {
      const { duration: _omitted, ...withoutDuration } = validVideoResource()

      void _omitted

      mockResource.mockResolvedValueOnce(withoutDuration)

      const result = await verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID, 12)

      expect(result.durationSeconds).toBe(12)

      expect(result).not.toHaveProperty('durationAssumed')
    })

    it('si no hay duración ni de la Admin API ni del navegador, rechaza en vez de inventarla', async () => {
      const { duration: _omitted, ...withoutDuration } = validVideoResource()

      void _omitted

      mockResource.mockResolvedValueOnce(withoutDuration)

      await expect(verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)).rejects.toThrow(
        'Cloudinary no ha devuelto la duración del vídeo.',
      )
    })

    it('la duración de la Admin API manda sobre la del navegador', async () => {
      mockResource.mockResolvedValueOnce(validVideoResource())

      const result = await verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID, 99)

      expect(result.durationSeconds).toBe(42.5)
    })

    it('rechaza un publicId fuera del directorio de vídeos permitido', async () => {
      await expect(
        verifyCloudinaryVideoAsset('greener/content/video-fuera/test'),
      ).rejects.toThrow(
        'El vídeo no pertenece al directorio permitido de Cloudinary.',
      )

      expect(mockResource).not.toHaveBeenCalled()
    })

    it('si la Admin API de Cloudinary falla, devuelve un error de verificación', async () => {
      mockResource.mockRejectedValueOnce(new Error('Cloudinary API down'))

      await expect(verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)).rejects.toThrow(
        'No se ha podido verificar el vídeo en Cloudinary.',
      )
    })

    it('rechaza metadatos incompletos del vídeo', async () => {
      mockResource.mockResolvedValueOnce({
        public_id: VIDEO_PUBLIC_ID,

        format: 'mp4',

        width: 1920,

        height: 1080,

        duration: 10,
      })

      await expect(verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)).rejects.toThrow(
        'Cloudinary ha devuelto datos incompletos para el vídeo.',
      )
    })

    it('rechaza un public_id distinto al solicitado', async () => {
      mockResource.mockResolvedValueOnce({
        ...validVideoResource(),

        public_id: 'greener/content/videos/otro-video',
      })

      await expect(verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)).rejects.toThrow(
        CloudinaryVideoVerificationError,
      )
    })

    it('rechaza un recurso que Cloudinary identifica como imagen', async () => {
      mockResource.mockResolvedValueOnce({
        ...validVideoResource(),

        resource_type: 'image',
      })

      await expect(verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)).rejects.toThrow(
        'El recurso de Cloudinary no es un vídeo.',
      )
    })

    it('rechaza un vídeo que supera el límite general de duración', async () => {
      mockResource.mockResolvedValueOnce({
        ...validVideoResource(),

        duration: 181,
      })

      mockValidateVideoUpload.mockReturnValueOnce({
        code: 'VIDEO_TOO_LONG',

        maxSeconds: 180,
      })

      await expect(verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)).rejects.toThrow(
        CloudinaryVideoVerificationError,
      )

      expect(mockValidateVideoUpload).toHaveBeenCalledWith(8192, 181)
    })

    it('rechaza un vídeo que supera el límite general de tamaño', async () => {
      const TOO_LARGE = 101 * 1024 * 1024

      mockResource.mockResolvedValueOnce({
        ...validVideoResource(),

        bytes: TOO_LARGE,
      })

      mockValidateVideoUpload.mockReturnValueOnce({
        code: 'VIDEO_TOO_LARGE',

        maxBytes: 100 * 1024 * 1024,
      })

      await expect(verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)).rejects.toThrow(
        CloudinaryVideoVerificationError,
      )

      expect(mockValidateVideoUpload).toHaveBeenCalledWith(TOO_LARGE, 42.5)
    })

    it('normaliza el formato del vídeo a minúsculas', async () => {
      mockResource.mockResolvedValueOnce({
        ...validVideoResource(),

        format: 'MP4',
      })

      const result = await verifyCloudinaryVideoAsset(VIDEO_PUBLIC_ID)

      expect(result.format).toBe('mp4')
    })
  })

  describe('deleteCloudinaryAsset', () => {
    it('borra una imagen usando resource_type image e invalidate', async () => {
      mockDestroy.mockResolvedValueOnce({
        result: 'ok',
      })

      await deleteCloudinaryAsset(IMAGE_PUBLIC_ID, 'image')

      expect(mockDestroy).toHaveBeenCalledWith(IMAGE_PUBLIC_ID, {
        resource_type: 'image',

        invalidate: true,
      })
    })

    it('considera not found como borrado satisfactorio', async () => {
      mockDestroy.mockResolvedValueOnce({
        result: 'not found',
      })

      await expect(
        deleteCloudinaryAsset(VIDEO_PUBLIC_ID, 'video'),
      ).resolves.toBeUndefined()
    })

    it('lanza si Cloudinary no confirma el borrado', async () => {
      mockDestroy.mockResolvedValueOnce({
        result: 'error',
      })

      await expect(
        deleteCloudinaryAsset(IMAGE_PUBLIC_ID, 'image'),
      ).rejects.toThrow('Cloudinary no ha podido borrar el recurso')
    })
  })
})

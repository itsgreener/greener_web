import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dbError } from '@tests/helpers/dbError'

/**
 * Las Server Actions de portada validan la entrada, llaman al caso de uso del
 * container y traducen resultado/errores para el ABM. La verificación del
 * archivo real, el calentamiento y el orden de la limpieza se prueban en
 * tests/unit/media/applicationLayer.test.ts.
 */

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/media/container', () => ({
  registerCoverImage: vi.fn(),
  registerCoverVideo: vi.fn(),
  deleteCoverMedia: vi.fn(),
}))

import {
  registerCoverImageAction,
  registerCoverVideoAction,
  deleteCoverMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/mediaActions'
import {
  deleteCoverMedia,
  registerCoverImage,
  registerCoverVideo,
} from '@/modules/media/container'
import {
  ImageVerificationError,
  VideoVerificationError,
} from '@/modules/media/domain/mediaVerification'

const VALID_IMAGE_INPUT = {
  contentId: CONTENT_ID,
  cloudinaryPublicId: 'greener/content/test-image',
  format: 'png',
  width: 10,
  height: 10,
  bytes: 10,
  ratio: '1:1',
}

const VALID_VIDEO_INPUT = {
  contentId: CONTENT_ID,
  cloudinaryPublicId: 'greener/content/videos/test-video',
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
  cloudinaryPublicId: 'greener/content/test-image',
  kind: 'image' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(registerCoverImage).mockResolvedValue(MEDIA_ID)
  vi.mocked(registerCoverVideo).mockResolvedValue(MEDIA_ID)
  vi.mocked(deleteCoverMedia).mockResolvedValue({ purged: 1, failed: 0 })
})

describe('registerCoverImageAction', () => {
  it('registra la imagen con el caso de uso y devuelve el id', async () => {
    const result = await registerCoverImageAction(VALID_IMAGE_INPUT)

    expect(result).toEqual({ ok: true, mediaId: MEDIA_ID })
    expect(registerCoverImage).toHaveBeenCalledWith(VALID_IMAGE_INPUT)
  })

  it('si el archivo no verifica, devuelve el mensaje de la verificación', async () => {
    vi.mocked(registerCoverImage).mockRejectedValueOnce(
      new ImageVerificationError('No se permiten imágenes animadas.'),
    )

    expect(await registerCoverImageAction(VALID_IMAGE_INPUT)).toEqual({
      ok: false,
      error: 'No se permiten imágenes animadas.',
    })
  })

  it('con datos inválidos no llega al caso de uso', async () => {
    const result = await registerCoverImageAction({
      ...VALID_IMAGE_INPUT,
      contentId: 'no-es-un-uuid',
    })

    expect(result.ok).toBe(false)
    expect(registerCoverImage).not.toHaveBeenCalled()
  })
})

describe('registerCoverVideoAction', () => {
  it('registra el vídeo con el caso de uso y devuelve el id', async () => {
    const result = await registerCoverVideoAction(VALID_VIDEO_INPUT)

    expect(result).toEqual({ ok: true, mediaId: MEDIA_ID })
    expect(registerCoverVideo).toHaveBeenCalledWith(VALID_VIDEO_INPUT)
  })

  it('si el archivo no verifica, devuelve el mensaje de la verificación', async () => {
    vi.mocked(registerCoverVideo).mockRejectedValueOnce(
      new VideoVerificationError(
        'No se ha podido verificar el vídeo en Cloudinary.',
      ),
    )

    expect(await registerCoverVideoAction(VALID_VIDEO_INPUT)).toEqual({
      ok: false,
      error: 'No se ha podido verificar el vídeo en Cloudinary.',
    })
  })

  it('con datos inválidos no llega al caso de uso', async () => {
    const result = await registerCoverVideoAction({
      ...VALID_VIDEO_INPUT,
      contentId: 'no-es-un-uuid',
    })

    expect(result.ok).toBe(false)
    expect(registerCoverVideo).not.toHaveBeenCalled()
  })
})

describe('deleteCoverMediaAction', () => {
  it('con datos inválidos, no llega al caso de uso', async () => {
    const result = await deleteCoverMediaAction({ contentId: 'no-es-uuid' })

    expect(result.ok).toBe(false)
    expect(deleteCoverMedia).not.toHaveBeenCalled()
  })

  it('si todo va bien, devuelve ok sin warning', async () => {
    expect(await deleteCoverMediaAction(VALID_DELETE_INPUT)).toEqual({
      ok: true,
    })
    expect(deleteCoverMedia).toHaveBeenCalledWith(VALID_DELETE_INPUT)
  })

  it('si Postgres falla porque el medio ya no coincide con el contenido, devuelve error', async () => {
    vi.mocked(deleteCoverMedia).mockRejectedValueOnce(
      dbError(
        'ZG013',
        'El contenido ya no apunta a este medio (posible carrera con otra pestaña)',
      ),
    )

    const result = await deleteCoverMediaAction(VALID_DELETE_INPUT)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error).toContain('otra pestaña')
    }
  })

  it('si Postgres falla por violación de FK, devuelve error legible', async () => {
    vi.mocked(deleteCoverMedia).mockRejectedValueOnce(
      dbError('23503', 'update or delete violates foreign key constraint'),
    )

    const result = await deleteCoverMediaAction(VALID_DELETE_INPUT)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error).toContain('se sigue usando en otro sitio')
    }
  })

  it('si Postgres tiene éxito pero el archivo no se pudo borrar, devuelve ok con warning', async () => {
    vi.mocked(deleteCoverMedia).mockResolvedValueOnce({ purged: 0, failed: 1 })

    const result = await deleteCoverMediaAction(VALID_DELETE_INPUT)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.warning).toContain('Cloudinary')
    }
  })
})

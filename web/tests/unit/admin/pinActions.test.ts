import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateTag } from 'next/cache'
import { dbError } from '@tests/helpers/dbError'

/**
 * Las Server Actions de pines validan la entrada, llaman al caso de uso del
 * container y traducen resultado/errores para el ABM. El orden de las
 * operaciones (verificar → crear → adjuntar → purgar), la limpieza del pin
 * si falla el adjuntado y el calentamiento se prueban en
 * tests/unit/pin/applicationLayer.test.ts.
 */

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('@/modules/pin/container', () => ({
  attachPinImage: vi.fn(),
  attachPinVideo: vi.fn(),
  createPin: vi.fn(),
  createPinWithImage: vi.fn(),
  createPinWithVideo: vi.fn(),
  deleteAllPins: vi.fn(),
  deletePin: vi.fn(),
  detachPinMedia: vi.fn(),
  updatePin: vi.fn(),
}))

import {
  createPinAction,
  updatePinAction,
  deletePinAction,
  createPinWithImageAction,
  createPinWithVideoAction,
  attachPinImageAction,
  attachPinVideoAction,
  detachPinMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/pinActions'
import {
  ImageVerificationError,
  VideoVerificationError,
} from '@/modules/media/domain/mediaVerification'
import {
  attachPinImage,
  attachPinVideo,
  createPin,
  createPinWithImage,
  createPinWithVideo,
  deletePin,
  detachPinMedia,
  updatePin,
} from '@/modules/pin/container'
import { CreatePinWithMediaError } from '@/modules/pin/domain/createPinWithMediaError'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

const PIN_ID = '22222222-2222-4222-8222-222222222222'

const MEDIA_ID = '33333333-3333-4333-8333-333333333333'

const CLOUDINARY_PUBLIC_ID = 'greener/content/test-image'

const VIDEO_CLOUDINARY_PUBLIC_ID = 'greener/content/videos/test-video'

function createValidFormData() {
  const formData = new FormData()

  formData.set('ratio', '1:1')
  formData.set('label', 'Pin de prueba')
  formData.set('language', 'es')
  formData.set('autoplayMode', '')
  formData.set('alt', 'Texto alternativo')

  return formData
}

const VALID_PIN_INPUT = {
  contentId: CONTENT_ID,
  ratio: '1:1',
  label: 'Pin de prueba',
  language: 'es',
  autoplayMode: null,
  alt: 'Texto alternativo',
}

const VALID_IMAGE_INPUT = {
  pinId: PIN_ID,
  cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,
  format: 'jpg',
  width: 1200,
  height: 800,
  bytes: 1024,
}

const VALID_VIDEO_INPUT = {
  pinId: PIN_ID,
  cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,
  format: 'mp4',
  width: 1200,
  height: 800,
  durationSeconds: 3,
  bytes: 1024,
}

const VALID_PIN_WITH_IMAGE = {
  ...VALID_PIN_INPUT,
  cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,
  format: 'jpg',
  width: 1200,
  height: 800,
  bytes: 1024,
}

const VALID_PIN_WITH_VIDEO = {
  ...VALID_PIN_INPUT,
  cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,
  format: 'mp4',
  width: 1920,
  height: 1080,
  durationSeconds: 5,
  bytes: 1024,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(createPin).mockResolvedValue(PIN_ID)
  vi.mocked(updatePin).mockResolvedValue(PIN_ID)
  vi.mocked(deletePin).mockResolvedValue({ purged: 1, failed: 0 })
  vi.mocked(attachPinImage).mockResolvedValue(MEDIA_ID)
  vi.mocked(attachPinVideo).mockResolvedValue(MEDIA_ID)
  vi.mocked(detachPinMedia).mockResolvedValue({ purged: 1, failed: 0 })
  vi.mocked(createPinWithImage).mockResolvedValue({
    pinId: PIN_ID,
    mediaId: MEDIA_ID,
  })
  vi.mocked(createPinWithVideo).mockResolvedValue({
    pinId: PIN_ID,
    mediaId: MEDIA_ID,
  })
})

describe('createPinAction', () => {
  it('con datos válidos, crea y devuelve success', async () => {
    const result = await createPinAction(CONTENT_ID, {}, createValidFormData())

    expect(result).toEqual({ success: true })
    expect(createPin).toHaveBeenCalledTimes(1)
    expect(updateTag).toHaveBeenCalledWith('feed-dataset')
  })

  it('con alt vacío, no llega a llamar a createPin', async () => {
    const formData = createValidFormData()

    formData.set('alt', '')

    const result = await createPinAction(CONTENT_ID, {}, formData)

    expect(result.fieldErrors).toBeDefined()
    expect(createPin).not.toHaveBeenCalled()
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

    expect(result).toEqual({ success: true })
    expect(updatePin).toHaveBeenCalledTimes(1)
  })
})

describe('deletePinAction', () => {
  it('con un id válido, borra y devuelve success', async () => {
    const result = await deletePinAction(PIN_ID, CONTENT_ID)

    expect(result).toEqual({ success: true })
    expect(deletePin).toHaveBeenCalledExactlyOnceWith({ id: PIN_ID })
  })

  it('si el borrado falla, devuelve un error legible', async () => {
    vi.mocked(deletePin).mockRejectedValueOnce(new Error('boom'))

    const result = await deletePinAction(PIN_ID, CONTENT_ID)

    expect(result.formError).toBe('No se ha podido borrar el pin.')
  })

  it('si no se puede borrar algún archivo, el pin se da por borrado y se devuelve un aviso', async () => {
    vi.mocked(deletePin).mockResolvedValueOnce({ purged: 0, failed: 2 })

    const result = await deletePinAction(PIN_ID, CONTENT_ID)

    expect(result.success).toBe(true)
    expect(result.formError).toBeUndefined()
    expect(result.warning).toContain('2 archivo(s)')
  })

  it('con un id inválido no llega al caso de uso', async () => {
    const result = await deletePinAction('no-uuid', CONTENT_ID)

    expect(result.formError).toBeDefined()
    expect(deletePin).not.toHaveBeenCalled()
  })
})

describe('createPinWithVideoAction (carga masiva con vídeo, 5 oct 2026)', () => {
  it('delega en el caso de uso y devuelve ambos ids', async () => {
    const result = await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)

    expect(result).toEqual({ ok: true, pinId: PIN_ID, mediaId: MEDIA_ID })
    expect(createPinWithVideo).toHaveBeenCalledWith({
      pin: expect.objectContaining({ contentId: CONTENT_ID }),
      video: expect.objectContaining({
        cloudinaryPublicId: VIDEO_CLOUDINARY_PUBLIC_ID,
        durationSeconds: 5,
      }),
    })
  })

  it('datos de vídeo inválidos (más de 15 s): se rechaza sin llegar al caso de uso', async () => {
    const result = await createPinWithVideoAction({
      ...VALID_PIN_WITH_VIDEO,
      durationSeconds: 16,
    })

    expect(result).toEqual({
      ok: false,
      error: 'Los datos del vídeo no son válidos.',
    })
    expect(createPinWithVideo).not.toHaveBeenCalled()
  })

  it('datos de pin inválidos (sin alt): se rechaza sin llegar al caso de uso', async () => {
    const result = await createPinWithVideoAction({
      ...VALID_PIN_WITH_VIDEO,
      alt: '',
    })

    expect(result.ok).toBe(false)
    expect(createPinWithVideo).not.toHaveBeenCalled()
  })

  it('pasa la duración del navegador redondeada hacia arriba, como último recurso para la verificación', async () => {
    await createPinWithVideoAction({
      ...VALID_PIN_WITH_VIDEO,
      durationSeconds: 6.4,
    })

    expect(createPinWithVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ durationSeconds: 7 }),
      }),
    )
  })

  it('si el archivo no verifica, devuelve el mensaje de la verificación', async () => {
    vi.mocked(createPinWithVideo).mockRejectedValueOnce(
      new CreatePinWithMediaError(
        'verify',
        new VideoVerificationError('El vídeo no existe en Cloudinary.'),
      ),
    )

    expect(await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)).toEqual({
      ok: false,
      error: 'El vídeo no existe en Cloudinary.',
    })
  })

  it('si el SQL rechaza el vídeo (límite por tipo de contenido), explica el límite', async () => {
    vi.mocked(createPinWithVideo).mockRejectedValueOnce(
      new CreatePinWithMediaError(
        'attach',
        dbError('ZG004', 'Animation is too long'),
      ),
    )

    expect(await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)).toEqual({
      ok: false,
      error:
        'El vídeo supera la duración máxima de un pin (8 s; 15 s en las tools).',
    })
  })

  it('si además el peso excede el máximo, lo explica', async () => {
    vi.mocked(createPinWithVideo).mockRejectedValueOnce(
      new CreatePinWithMediaError(
        'attach',
        dbError('ZG003', 'Video is too large'),
      ),
    )

    const result = await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toContain('peso máximo')
  })

  it('si no se puede crear el pin, devuelve el error', async () => {
    vi.mocked(createPinWithVideo).mockRejectedValueOnce(
      new CreatePinWithMediaError('create_pin', new Error('db down')),
    )

    expect(await createPinWithVideoAction(VALID_PIN_WITH_VIDEO)).toEqual({
      ok: false,
      error: 'No se ha podido crear el pin.',
    })
  })
})

describe('createPinWithImageAction', () => {
  it('con datos válidos, delega en el caso de uso y devuelve ambos ids', async () => {
    const result = await createPinWithImageAction(VALID_PIN_WITH_IMAGE)

    expect(result).toEqual({ ok: true, pinId: PIN_ID, mediaId: MEDIA_ID })
    expect(createPinWithImage).toHaveBeenCalledWith({
      pin: expect.objectContaining({ contentId: CONTENT_ID }),
      cloudinaryPublicId: CLOUDINARY_PUBLIC_ID,
    })
  })

  it('con datos de pin inválidos, no llega al caso de uso', async () => {
    const result = await createPinWithImageAction({
      ...VALID_PIN_WITH_IMAGE,
      alt: '',
    })

    expect(result.ok).toBe(false)
    expect(createPinWithImage).not.toHaveBeenCalled()
  })

  it('auditoría 8 oct, P0-7: si adjuntar falla, un fallo inesperado no filtra su texto interno', async () => {
    vi.mocked(createPinWithImage).mockRejectedValueOnce(
      new CreatePinWithMediaError('attach', new Error('fallo al adjuntar')),
    )

    expect(await createPinWithImageAction(VALID_PIN_WITH_IMAGE)).toEqual({
      ok: false,
      error: 'No se ha podido adjuntar la imagen.',
    })
  })

  it('auditoría 8 oct, P0-7: si el archivo no verifica, devuelve el mensaje de la verificación', async () => {
    vi.mocked(createPinWithImage).mockRejectedValueOnce(
      new CreatePinWithMediaError(
        'verify',
        new ImageVerificationError('No se permiten archivos GIF.'),
      ),
    )

    expect(await createPinWithImageAction(VALID_PIN_WITH_IMAGE)).toEqual({
      ok: false,
      error: 'No se permiten archivos GIF.',
    })
  })
})

describe('attachPinImageAction', () => {
  it('con datos válidos, adjunta y devuelve ok', async () => {
    const result = await attachPinImageAction(VALID_IMAGE_INPUT)

    expect(result).toEqual({ ok: true, mediaId: MEDIA_ID })
    expect(attachPinImage).toHaveBeenCalledWith(VALID_IMAGE_INPUT)
  })

  it('traduce el error de límite de 8 medios al mensaje del dominio', async () => {
    vi.mocked(attachPinImage).mockRejectedValueOnce(
      dbError('ZG005', 'Un pin admite hasta 8 medios'),
    )

    expect(await attachPinImageAction(VALID_IMAGE_INPUT)).toEqual({
      ok: false,
      error: 'Un pin admite hasta 8 medios',
    })
  })

  it('con datos inválidos, no llega al caso de uso', async () => {
    const result = await attachPinImageAction({
      ...VALID_IMAGE_INPUT,
      pinId: 'no-es-un-uuid',
    })

    expect(result.ok).toBe(false)
    expect(attachPinImage).not.toHaveBeenCalled()
  })

  it('si la verificación falla, devuelve el mensaje', async () => {
    vi.mocked(attachPinImage).mockRejectedValueOnce(
      new ImageVerificationError('No se permiten imágenes animadas.'),
    )

    expect(await attachPinImageAction(VALID_IMAGE_INPUT)).toEqual({
      ok: false,
      error: 'No se permiten imágenes animadas.',
    })
  })
})

describe('attachPinVideoAction', () => {
  it('con datos válidos, adjunta y devuelve ok', async () => {
    const result = await attachPinVideoAction(VALID_VIDEO_INPUT)

    expect(result).toEqual({ ok: true, mediaId: MEDIA_ID })
    expect(attachPinVideo).toHaveBeenCalledWith(VALID_VIDEO_INPUT)
  })

  it('pasa al caso de uso la duración del navegador redondeada hacia arriba', async () => {
    await attachPinVideoAction({ ...VALID_VIDEO_INPUT, durationSeconds: 6.4 })

    expect(attachPinVideo).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 7 }),
    )
  })

  it('si la verificación falla, devuelve el mensaje', async () => {
    vi.mocked(attachPinVideo).mockRejectedValueOnce(
      new VideoVerificationError(
        'No se ha podido verificar el vídeo en Cloudinary.',
      ),
    )

    expect(await attachPinVideoAction(VALID_VIDEO_INPUT)).toEqual({
      ok: false,
      error: 'No se ha podido verificar el vídeo en Cloudinary.',
    })
  })

  it('traduce el error de duración a un mensaje legible', async () => {
    vi.mocked(attachPinVideo).mockRejectedValueOnce(
      dbError('ZG004', 'Animation is too long'),
    )

    expect(await attachPinVideoAction(VALID_VIDEO_INPUT)).toEqual({
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

  it('si todo va bien, devuelve ok sin warning', async () => {
    expect(await detachPinMediaAction(VALID_DETACH_INPUT)).toEqual({ ok: true })
    expect(detachPinMedia).toHaveBeenCalledTimes(1)
  })

  it('si Postgres falla, devuelve el error legible', async () => {
    vi.mocked(detachPinMedia).mockRejectedValueOnce(
      dbError('ZG014', 'Este medio no pertenece a este pin'),
    )

    expect(await detachPinMediaAction(VALID_DETACH_INPUT)).toEqual({
      ok: false,
      error: 'Este medio no pertenece a este pin',
    })
  })

  it('si el archivo no se pudo borrar, devuelve ok con warning', async () => {
    vi.mocked(detachPinMedia).mockResolvedValueOnce({ purged: 0, failed: 1 })

    const result = await detachPinMediaAction(VALID_DETACH_INPUT)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.warning).toContain('Cloudinary')
    }
  })

  it('con datos inválidos no llega al caso de uso', async () => {
    const result = await detachPinMediaAction({
      ...VALID_DETACH_INPUT,
      mediaId: 'nope',
    })

    expect(result.ok).toBe(false)
    expect(detachPinMedia).not.toHaveBeenCalled()
  })
})

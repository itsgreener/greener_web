import { describe, it, expect, vi, beforeEach } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const PIN_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

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
vi.mock('@/modules/media/infrastructure/cloudinaryServer', () => ({
  deleteCloudinaryAsset: vi.fn(),
}))

function formData(entries: Record<string, string>) {
  const data = new FormData()

  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value)
  }

  return data
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createPinAction', () => {
  it('con datos válidos, crea y devuelve success', async () => {
    const { createPinAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { createPin } = await import('@/modules/pin/application/createPin')

    vi.mocked(createPin).mockResolvedValue(PIN_ID)

    const result = await createPinAction(
      CONTENT_ID,
      {},
      formData({
        ratio: '1:1',
        showAsCarousel: 'true',
        label: 'Pin',
        language: 'es',
        queueOrder: '0',
        alt: 'Alt',
      }),
    )

    expect(result.success).toBe(true)
    expect(createPin).toHaveBeenCalledOnce()
    expect(vi.mocked(createPin).mock.calls[0][0].contentId).toBe(CONTENT_ID)
  })

  it('con alt vacío, no llega a llamar a createPin', async () => {
    const { createPinAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { createPin } = await import('@/modules/pin/application/createPin')

    const result = await createPinAction(
      CONTENT_ID,
      {},
      formData({
        ratio: '1:1',
        showAsCarousel: 'true',
        label: 'Pin',
        language: 'es',
        queueOrder: '0',
        alt: '',
      }),
    )

    expect(result.fieldErrors?.alt?.[0]).toBeTruthy()
    expect(createPin).not.toHaveBeenCalled()
  })
})

describe('updatePinAction', () => {
  it('con datos válidos, actualiza y devuelve success', async () => {
    const { updatePinAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { updatePin } = await import('@/modules/pin/application/updatePin')

    vi.mocked(updatePin).mockResolvedValue(PIN_ID)

    const result = await updatePinAction(
      PIN_ID,
      CONTENT_ID,
      {},
      formData({
        ratio: '4:5',
        showAsCarousel: 'false',
        label: 'Actualizado',
        language: 'es',
        queueOrder: '1',
        alt: 'Alt',
      }),
    )

    expect(result.success).toBe(true)
    expect(vi.mocked(updatePin).mock.calls[0][0].id).toBe(PIN_ID)
  })

  it('con queueOrder negativo, no llega a llamar a updatePin', async () => {
    const { updatePinAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { updatePin } = await import('@/modules/pin/application/updatePin')

    const result = await updatePinAction(
      PIN_ID,
      CONTENT_ID,
      {},
      formData({
        ratio: '4:5',
        showAsCarousel: 'false',
        label: 'Actualizado',
        language: 'es',
        queueOrder: '-1',
        alt: 'Alt',
      }),
    )

    expect(result.fieldErrors?.queueOrder?.[0]).toBeTruthy()
    expect(updatePin).not.toHaveBeenCalled()
  })
})

describe('deletePinAction', () => {
  it('con un id válido, borra y devuelve success', async () => {
    const { deletePinAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { deletePin } = await import('@/modules/pin/application/deletePin')

    vi.mocked(deletePin).mockResolvedValue(PIN_ID)

    const result = await deletePinAction(PIN_ID, CONTENT_ID)

    expect(result.success).toBe(true)
    expect(deletePin).toHaveBeenCalledWith({ id: PIN_ID })
  })
})

describe('createPinWithImageAction', () => {
  const validInput = {
    contentId: CONTENT_ID,
    ratio: '1:1',
    showAsCarousel: true,
    label: 'Pin de lote',
    language: 'es',
    autoplayMode: null,
    speedMs: null,
    queueOrder: 0,
    alt: 'Alt de lote',
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
  }

  it('con datos válidos, crea el pin y adjunta la imagen', async () => {
    const { createPinWithImageAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { createPin } = await import('@/modules/pin/application/createPin')
    const { attachPinImage } =
      await import('@/modules/pin/application/attachPinImage')

    vi.mocked(createPin).mockResolvedValue(PIN_ID)
    vi.mocked(attachPinImage).mockResolvedValue(MEDIA_ID)

    const result = await createPinWithImageAction(validInput)

    expect(result).toEqual({ ok: true, pinId: PIN_ID, mediaId: MEDIA_ID })
    expect(attachPinImage).toHaveBeenCalledWith(
      expect.objectContaining({ pinId: PIN_ID, slideOrder: 0 }),
    )
  })

  it('con datos de pin inválidos, no llega a llamar a createPin', async () => {
    const { createPinWithImageAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { createPin } = await import('@/modules/pin/application/createPin')

    const result = await createPinWithImageAction({ ...validInput, alt: '' })

    expect(result.ok).toBe(false)
    expect(createPin).not.toHaveBeenCalled()
  })

  it('si createPin falla, no llega a llamar a attachPinImage', async () => {
    const { createPinWithImageAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { createPin } = await import('@/modules/pin/application/createPin')
    const { attachPinImage } =
      await import('@/modules/pin/application/attachPinImage')

    vi.mocked(createPin).mockRejectedValue(new Error('db down'))

    const result = await createPinWithImageAction(validInput)

    expect(result.ok).toBe(false)
    expect(attachPinImage).not.toHaveBeenCalled()
  })

  it('si el pin se crea pero adjuntar la imagen falla, informa el pinId — el pin no se pierde', async () => {
    const { createPinWithImageAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { createPin } = await import('@/modules/pin/application/createPin')
    const { attachPinImage } =
      await import('@/modules/pin/application/attachPinImage')

    vi.mocked(createPin).mockResolvedValue(PIN_ID)
    vi.mocked(attachPinImage).mockRejectedValue(new Error('Image is too large'))

    const result = await createPinWithImageAction(validInput)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.pinId).toBe(PIN_ID)
      expect(result.error).toContain('Image is too large')
    }
  })
})

describe('attachPinImageAction', () => {
  const validInput = {
    pinId: PIN_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
    slideOrder: 0,
  }

  it('con datos válidos, adjunta y devuelve ok', async () => {
    const { attachPinImageAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { attachPinImage } =
      await import('@/modules/pin/application/attachPinImage')

    vi.mocked(attachPinImage).mockResolvedValue(MEDIA_ID)

    const result = await attachPinImageAction(validInput)

    expect(result).toEqual({ ok: true, mediaId: MEDIA_ID })
  })

  it('traduce el error de límite de 8 medios al mensaje del dominio', async () => {
    const { attachPinImageAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { attachPinImage } =
      await import('@/modules/pin/application/attachPinImage')

    vi.mocked(attachPinImage).mockRejectedValue(
      new Error('Un pin admite hasta 8 medios'),
    )

    const result = await attachPinImageAction(validInput)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('admite hasta 8 medios')
    }
  })

  it('con datos inválidos, no llega a llamar a attachPinImage', async () => {
    const { attachPinImageAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { attachPinImage } =
      await import('@/modules/pin/application/attachPinImage')

    const result = await attachPinImageAction({ ...validInput, slideOrder: 9 })

    expect(result.ok).toBe(false)
    expect(attachPinImage).not.toHaveBeenCalled()
  })
})

describe('attachPinVideoAction', () => {
  const validInput = {
    pinId: PIN_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1080,
    height: 1080,
    durationSeconds: 3,
    bytes: 2 * 1024 * 1024,
    slideOrder: 0,
  }

  it('con datos válidos, adjunta y devuelve ok', async () => {
    const { attachPinVideoAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { attachPinVideo } =
      await import('@/modules/pin/application/attachPinVideo')

    vi.mocked(attachPinVideo).mockResolvedValue(MEDIA_ID)

    const result = await attachPinVideoAction(validInput)

    expect(result).toEqual({ ok: true, mediaId: MEDIA_ID })
  })

  it('traduce el error de duración a un mensaje legible', async () => {
    const { attachPinVideoAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { attachPinVideo } =
      await import('@/modules/pin/application/attachPinVideo')

    vi.mocked(attachPinVideo).mockRejectedValue(
      new Error('Animation is too long'),
    )

    const result = await attachPinVideoAction(validInput)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('5 segundos')
    }
  })
})

describe('detachPinMediaAction', () => {
  const validInput = {
    pinId: PIN_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    kind: 'image' as const,
  }

  it('si Postgres y Cloudinary van bien, devuelve ok sin warning', async () => {
    const { detachPinMediaAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { detachPinMedia } =
      await import('@/modules/pin/application/detachPinMedia')
    const { deleteCloudinaryAsset } =
      await import('@/modules/media/infrastructure/cloudinaryServer')

    vi.mocked(detachPinMedia).mockResolvedValue(MEDIA_ID)
    vi.mocked(deleteCloudinaryAsset).mockResolvedValue(undefined)

    const result = await detachPinMediaAction(validInput)

    expect(result).toEqual({ ok: true })
  })

  it('si Postgres falla, aborta sin llamar a Cloudinary', async () => {
    const { detachPinMediaAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { detachPinMedia } =
      await import('@/modules/pin/application/detachPinMedia')
    const { deleteCloudinaryAsset } =
      await import('@/modules/media/infrastructure/cloudinaryServer')

    vi.mocked(detachPinMedia).mockRejectedValue(
      new Error('Este medio no pertenece a este pin'),
    )

    const result = await detachPinMediaAction(validInput)

    expect(result.ok).toBe(false)
    expect(deleteCloudinaryAsset).not.toHaveBeenCalled()
  })

  it('si Postgres va bien pero Cloudinary falla, devuelve ok con warning', async () => {
    const { detachPinMediaAction } =
      await import('@/app/admin/contents/[id]/edit/pinActions')
    const { detachPinMedia } =
      await import('@/modules/pin/application/detachPinMedia')
    const { deleteCloudinaryAsset } =
      await import('@/modules/media/infrastructure/cloudinaryServer')

    vi.mocked(detachPinMedia).mockResolvedValue(MEDIA_ID)
    vi.mocked(deleteCloudinaryAsset).mockRejectedValue(new Error('fallo'))

    const result = await detachPinMediaAction(validInput)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.warning).toBeDefined()
    }
  })
})

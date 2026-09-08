import { describe, it, expect, vi, beforeEach } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const PIN_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

vi.mock('@/modules/pin/infrastructure/supabasePinRepository', () => ({
  supabasePinRepository: {
    listByContentId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/modules/pin/infrastructure/supabasePinMediaRepository', () => ({
  supabasePinMediaRepository: {
    attachImage: vi.fn(),
    attachVideo: vi.fn(),
    detach: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const validCreateInput = {
  contentId: CONTENT_ID,
  type: 'fixed' as const,
  ratio: '1:1' as const,
  label: 'Pin de ejemplo',
  cta: null,
  language: 'es' as const,
  autoplayMode: null,
  speedMs: null,
  queueOrder: 0,
  alt: 'Alt',
}

describe('createPin', () => {
  it('valida y delega en supabasePinRepository.create', async () => {
    const { createPin } = await import('@/modules/pin/application/createPin')
    const { supabasePinRepository } =
      await import('@/modules/pin/infrastructure/supabasePinRepository')

    vi.mocked(supabasePinRepository.create).mockResolvedValue(PIN_ID)

    const result = await createPin(validCreateInput)

    expect(result).toBe(PIN_ID)
    expect(supabasePinRepository.create).toHaveBeenCalledOnce()
  })

  it('rechaza un alt vacío sin llamar al repositorio', async () => {
    const { createPin } = await import('@/modules/pin/application/createPin')
    const { supabasePinRepository } =
      await import('@/modules/pin/infrastructure/supabasePinRepository')

    await expect(createPin({ ...validCreateInput, alt: '' })).rejects.toThrow()

    expect(supabasePinRepository.create).not.toHaveBeenCalled()
  })
})

describe('updatePin', () => {
  const validUpdateInput = {
    id: PIN_ID,
    ratio: '4:5' as const,
    label: 'Actualizado',
    cta: null,
    language: 'es' as const,
    autoplayMode: null,
    speedMs: null,
    queueOrder: 1,
    alt: 'Alt actualizado',
  }

  it('valida y delega en supabasePinRepository.update', async () => {
    const { updatePin } = await import('@/modules/pin/application/updatePin')
    const { supabasePinRepository } =
      await import('@/modules/pin/infrastructure/supabasePinRepository')

    vi.mocked(supabasePinRepository.update).mockResolvedValue(PIN_ID)

    const result = await updatePin(validUpdateInput)

    expect(result).toBe(PIN_ID)
    expect(supabasePinRepository.update).toHaveBeenCalledOnce()
  })

  it('rechaza queueOrder negativo sin llamar al repositorio', async () => {
    const { updatePin } = await import('@/modules/pin/application/updatePin')
    const { supabasePinRepository } =
      await import('@/modules/pin/infrastructure/supabasePinRepository')

    await expect(
      updatePin({ ...validUpdateInput, queueOrder: -1 }),
    ).rejects.toThrow()

    expect(supabasePinRepository.update).not.toHaveBeenCalled()
  })
})

describe('deletePin', () => {
  it('delega en supabasePinRepository.delete', async () => {
    const { deletePin } = await import('@/modules/pin/application/deletePin')
    const { supabasePinRepository } =
      await import('@/modules/pin/infrastructure/supabasePinRepository')

    vi.mocked(supabasePinRepository.delete).mockResolvedValue(PIN_ID)

    const result = await deletePin({ id: PIN_ID })

    expect(result).toBe(PIN_ID)
    expect(supabasePinRepository.delete).toHaveBeenCalledWith({ id: PIN_ID })
  })
})

describe('listPins', () => {
  it('delega en supabasePinRepository.listByContentId', async () => {
    const { listPins } = await import('@/modules/pin/application/listPins')
    const { supabasePinRepository } =
      await import('@/modules/pin/infrastructure/supabasePinRepository')

    vi.mocked(supabasePinRepository.listByContentId).mockResolvedValue([])

    const result = await listPins(CONTENT_ID)

    expect(result).toEqual([])
    expect(supabasePinRepository.listByContentId).toHaveBeenCalledWith(
      CONTENT_ID,
    )
  })
})

describe('attachPinImage', () => {
  const validInput = {
    pinId: PIN_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
    slideOrder: 0,
  }

  it('valida y delega en supabasePinMediaRepository.attachImage', async () => {
    const { attachPinImage } =
      await import('@/modules/pin/application/attachPinImage')
    const { supabasePinMediaRepository } =
      await import('@/modules/pin/infrastructure/supabasePinMediaRepository')

    vi.mocked(supabasePinMediaRepository.attachImage).mockResolvedValue(
      MEDIA_ID,
    )

    const result = await attachPinImage(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(supabasePinMediaRepository.attachImage).toHaveBeenCalledWith(
      validInput,
    )
  })

  it('rechaza slideOrder fuera de 0-7 sin llamar al repositorio', async () => {
    const { attachPinImage } =
      await import('@/modules/pin/application/attachPinImage')
    const { supabasePinMediaRepository } =
      await import('@/modules/pin/infrastructure/supabasePinMediaRepository')

    await expect(
      attachPinImage({ ...validInput, slideOrder: 9 }),
    ).rejects.toThrow()

    expect(supabasePinMediaRepository.attachImage).not.toHaveBeenCalled()
  })
})

describe('attachPinVideo', () => {
  const validInput = {
    pinId: PIN_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1080,
    height: 1080,
    durationSeconds: 3,
    bytes: 2 * 1024 * 1024,
  }

  it('valida y delega en supabasePinMediaRepository.attachVideo', async () => {
    const { attachPinVideo } =
      await import('@/modules/pin/application/attachPinVideo')
    const { supabasePinMediaRepository } =
      await import('@/modules/pin/infrastructure/supabasePinMediaRepository')

    vi.mocked(supabasePinMediaRepository.attachVideo).mockResolvedValue(
      MEDIA_ID,
    )

    const result = await attachPinVideo(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(supabasePinMediaRepository.attachVideo).toHaveBeenCalledOnce()
  })

  it('rechaza más de 5 segundos sin llamar al repositorio', async () => {
    const { attachPinVideo } =
      await import('@/modules/pin/application/attachPinVideo')
    const { supabasePinMediaRepository } =
      await import('@/modules/pin/infrastructure/supabasePinMediaRepository')

    await expect(
      attachPinVideo({ ...validInput, durationSeconds: 10 }),
    ).rejects.toThrow()

    expect(supabasePinMediaRepository.attachVideo).not.toHaveBeenCalled()
  })
})

describe('detachPinMedia', () => {
  it('valida y delega en supabasePinMediaRepository.detach', async () => {
    const { detachPinMedia } =
      await import('@/modules/pin/application/detachPinMedia')
    const { supabasePinMediaRepository } =
      await import('@/modules/pin/infrastructure/supabasePinMediaRepository')

    const input = {
      pinId: PIN_ID,
      mediaId: MEDIA_ID,
      cloudinaryPublicId: 'greener/content/abc123',
      kind: 'image' as const,
    }

    vi.mocked(supabasePinMediaRepository.detach).mockResolvedValue(MEDIA_ID)

    const result = await detachPinMedia(input)

    expect(result).toBe(MEDIA_ID)
    expect(supabasePinMediaRepository.detach).toHaveBeenCalledWith(input)
  })
})

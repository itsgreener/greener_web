import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dbError } from '@tests/helpers/dbError'

/**
 * Las Server Actions del carrusel solo validan la entrada, llaman al caso de
 * uso del container y traducen el resultado/error para el ABM. La
 * verificación en Cloudinary, el orden leer → desvincular → purgar y el
 * calentamiento se prueban en tests/unit/content/caseCarousel.test.ts.
 */

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

const MEDIA_ID = '22222222-2222-4222-8222-222222222222'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/content/container', () => ({
  addCaseCarouselImage: vi.fn(),
  addCaseCarouselVideo: vi.fn(),
  removeCaseCarouselMedia: vi.fn(),
  removeAllCaseCarouselMedia: vi.fn(),
}))

import {
  addCaseCarouselImageAction,
  addCaseCarouselVideoAction,
  removeAllCaseCarouselMediaAction,
  removeCaseCarouselMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions'
import {
  addCaseCarouselImage,
  addCaseCarouselVideo,
  removeAllCaseCarouselMedia,
  removeCaseCarouselMedia,
} from '@/modules/content/container'
import {
  ImageVerificationError,
  VideoVerificationError,
} from '@/modules/media/domain/mediaVerification'

const VALID_IMAGE_INPUT = {
  contentId: CONTENT_ID,
  cloudinaryPublicId: 'greener/content/case-image',
  format: 'jpg',
  width: 10,
  height: 10,
  bytes: 10,
  sortOrder: 0,
  alt: 'Imagen del caso',
}

const VALID_VIDEO_INPUT = {
  contentId: CONTENT_ID,
  cloudinaryPublicId: 'greener/content/videos/case-video',
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
  cloudinaryPublicId: 'greener/content/videos/case-video',
  kind: 'video' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(addCaseCarouselImage).mockResolvedValue(MEDIA_ID)
  vi.mocked(addCaseCarouselVideo).mockResolvedValue(MEDIA_ID)
  vi.mocked(removeCaseCarouselMedia).mockResolvedValue({
    purged: 1,
    failed: 0,
  })
})

describe('addCaseCarouselImageAction', () => {
  it('registra la imagen con el caso de uso y devuelve el id', async () => {
    const result = await addCaseCarouselImageAction(VALID_IMAGE_INPUT)

    expect(result).toEqual({ ok: true, mediaId: MEDIA_ID })
    expect(addCaseCarouselImage).toHaveBeenCalledWith(VALID_IMAGE_INPUT)
  })

  it('si el archivo no verifica, devuelve el mensaje de la verificación', async () => {
    vi.mocked(addCaseCarouselImage).mockRejectedValueOnce(
      new ImageVerificationError('No se permiten imágenes animadas.'),
    )

    expect(await addCaseCarouselImageAction(VALID_IMAGE_INPUT)).toEqual({
      ok: false,
      error: 'No se permiten imágenes animadas.',
    })
  })

  it('con datos inválidos no llega al caso de uso', async () => {
    const result = await addCaseCarouselImageAction({
      ...VALID_IMAGE_INPUT,
      contentId: 'no-es-un-uuid',
    })

    expect(result.ok).toBe(false)
    expect(addCaseCarouselImage).not.toHaveBeenCalled()
  })
})

describe('addCaseCarouselVideoAction', () => {
  it('registra el vídeo con el caso de uso y devuelve el id', async () => {
    const result = await addCaseCarouselVideoAction(VALID_VIDEO_INPUT)

    expect(result).toEqual({ ok: true, mediaId: MEDIA_ID })
    expect(addCaseCarouselVideo).toHaveBeenCalledWith(VALID_VIDEO_INPUT)
  })

  it('si el archivo no verifica, devuelve el mensaje de la verificación', async () => {
    vi.mocked(addCaseCarouselVideo).mockRejectedValueOnce(
      new VideoVerificationError(
        'No se ha podido verificar el vídeo en Cloudinary.',
      ),
    )

    expect(await addCaseCarouselVideoAction(VALID_VIDEO_INPUT)).toEqual({
      ok: false,
      error: 'No se ha podido verificar el vídeo en Cloudinary.',
    })
  })

  it('con datos inválidos no llega al caso de uso', async () => {
    const result = await addCaseCarouselVideoAction({
      ...VALID_VIDEO_INPUT,
      contentId: 'no-es-un-uuid',
    })

    expect(result.ok).toBe(false)
    expect(addCaseCarouselVideo).not.toHaveBeenCalled()
  })
})

describe('removeCaseCarouselMediaAction', () => {
  it('desvincula con el caso de uso', async () => {
    expect(await removeCaseCarouselMediaAction(VALID_REMOVE_INPUT)).toEqual({
      ok: true,
    })
    expect(removeCaseCarouselMedia).toHaveBeenCalledWith(VALID_REMOVE_INPUT)
  })

  it('si Postgres falla, devuelve el error legible', async () => {
    vi.mocked(removeCaseCarouselMedia).mockRejectedValueOnce(
      dbError('ZG014', 'Este medio no pertenece a este caso'),
    )

    expect(await removeCaseCarouselMediaAction(VALID_REMOVE_INPUT)).toEqual({
      ok: false,
      error: 'Este medio no pertenece a este caso',
    })
  })

  it('si el archivo no se pudo borrar tras desvincular, devuelve warning', async () => {
    vi.mocked(removeCaseCarouselMedia).mockResolvedValueOnce({
      purged: 0,
      failed: 1,
    })

    const result = await removeCaseCarouselMediaAction(VALID_REMOVE_INPUT)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.warning).toContain('Cloudinary')
    }
  })

  it('con datos inválidos no llega al caso de uso', async () => {
    const result = await removeCaseCarouselMediaAction({
      ...VALID_REMOVE_INPUT,
      mediaId: 'nope',
    })

    expect(result.ok).toBe(false)
    expect(removeCaseCarouselMedia).not.toHaveBeenCalled()
  })
})

describe('removeAllCaseCarouselMediaAction', () => {
  const outcome = (
    over: Partial<Awaited<ReturnType<typeof removeAllCaseCarouselMedia>>> = {},
  ) => ({
    total: 3,
    removed: 3,
    interrupted: false,
    purge: { purged: 3, failed: 0 },
    ...over,
  })

  it('quita todas y devuelve ok', async () => {
    vi.mocked(removeAllCaseCarouselMedia).mockResolvedValue(outcome())

    expect(await removeAllCaseCarouselMediaAction(CONTENT_ID)).toEqual({
      ok: true,
    })
    expect(removeAllCaseCarouselMedia).toHaveBeenCalledWith(CONTENT_ID)
  })

  it('si se interrumpe, informa de cuántas se quitaron', async () => {
    vi.mocked(removeAllCaseCarouselMedia).mockResolvedValue(
      outcome({ removed: 1, interrupted: true }),
    )

    const result = await removeAllCaseCarouselMediaAction(CONTENT_ID)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error).toContain('Se han quitado 1 de 3 diapositivas')
    }
  })

  it('si Cloudinary falla en algún archivo, devuelve aviso con el recuento', async () => {
    vi.mocked(removeAllCaseCarouselMedia).mockResolvedValue(
      outcome({ purge: { purged: 2, failed: 1 } }),
    )

    const result = await removeAllCaseCarouselMediaAction(CONTENT_ID)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.warning).toContain('1 archivo(s)')
    }
  })

  it('un caso sin diapositivas devuelve error', async () => {
    vi.mocked(removeAllCaseCarouselMedia).mockResolvedValue(
      outcome({ total: 0, removed: 0 }),
    )

    expect(await removeAllCaseCarouselMediaAction(CONTENT_ID)).toEqual({
      ok: false,
      error: 'Este caso no tiene diapositivas que quitar.',
    })
  })

  it('si no se puede leer el carrusel, devuelve error', async () => {
    vi.mocked(removeAllCaseCarouselMedia).mockRejectedValue(new Error('x'))

    expect(await removeAllCaseCarouselMediaAction(CONTENT_ID)).toEqual({
      ok: false,
      error: 'No se ha podido leer el carrusel del caso.',
    })
  })

  it('rechaza un identificador que no es uuid y no llama al caso de uso', async () => {
    const result = await removeAllCaseCarouselMediaAction('nope')

    expect(result.ok).toBe(false)
    expect(removeAllCaseCarouselMedia).not.toHaveBeenCalled()
  })
})

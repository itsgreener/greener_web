import { describe, it, expect, vi } from 'vitest'

import type { MediaCleanup } from '@/modules/media/domain/mediaCleanupPorts'
import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'
import { makeAttachPinImage } from '@/modules/pin/application/attachPinImage'
import { makeAttachPinVideo } from '@/modules/pin/application/attachPinVideo'
import { makeCreatePin } from '@/modules/pin/application/createPin'
import {
  makeCreatePinWithImage,
  makeCreatePinWithVideo,
} from '@/modules/pin/application/createPinWithMedia'
import {
  makeDeleteAllPins,
  makeDeletePin,
} from '@/modules/pin/application/deletePin'
import { makeDetachPinMedia } from '@/modules/pin/application/detachPinMedia'
import { makeUpdatePin } from '@/modules/pin/application/updatePin'
import { CreatePinWithMediaError } from '@/modules/pin/domain/createPinWithMediaError'
import type { PinMediaRepository } from '@/modules/pin/domain/pinMediaRepository'
import type { PinRepository } from '@/modules/pin/domain/pinRepository'

/**
 * Casos de uso de pines con puertos falsos (`makeX({ … })`): se comprueba el
 * contrato real — datos válidos llegan al repositorio ya parseados, los
 * inválidos no lo tocan nunca, y el orden de limpieza es leer → borrar →
 * purgar.
 */

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const PIN_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

function fakePins() {
  return {
    listByContentId: vi.fn<PinRepository['listByContentId']>(async () => []),
    create: vi.fn<PinRepository['create']>(async () => PIN_ID),
    update: vi.fn<PinRepository['update']>(async () => PIN_ID),
    delete: vi.fn<PinRepository['delete']>(async () => PIN_ID),
  } satisfies PinRepository
}

function fakePinMedia() {
  return {
    attachImage: vi.fn<PinMediaRepository['attachImage']>(async () => MEDIA_ID),
    attachVideo: vi.fn<PinMediaRepository['attachVideo']>(async () => MEDIA_ID),
    detach: vi.fn<PinMediaRepository['detach']>(async () => MEDIA_ID),
  } satisfies PinMediaRepository
}

function fakeCleanup() {
  return {
    snapshotPinMedia: vi.fn<MediaCleanup['snapshotPinMedia']>(async () => []),
    snapshotContentMedia: vi.fn<MediaCleanup['snapshotContentMedia']>(
      async () => [],
    ),
    snapshotMedia: vi.fn<MediaCleanup['snapshotMedia']>(async () => []),
    purgeRemovedMedia: vi.fn<MediaCleanup['purgeRemovedMedia']>(async () => ({
      purged: 0,
      failed: 0,
    })),
    discardUnregisteredUpload: vi.fn<MediaCleanup['discardUnregisteredUpload']>(
      async () => false,
    ),
  } satisfies MediaCleanup
}

/** Devuelve lo que se le configura como «metadatos reales» del archivo. */
function fakeVerifier(
  image: Record<string, unknown> = {},
  video: Record<string, unknown> = {},
) {
  return {
    verifyImage: vi.fn<MediaVerifier['verifyImage']>(async (publicId) => ({
      cloudinaryPublicId: publicId,
      format: 'webp',
      width: 1200,
      height: 800,
      bytes: 500_000,
      ...image,
    })),
    verifyVideo: vi.fn<MediaVerifier['verifyVideo']>(async (publicId) => ({
      cloudinaryPublicId: publicId,
      format: 'mp4',
      width: 1080,
      height: 1080,
      durationSeconds: 3,
      bytes: 2 * 1024 * 1024,
      ...video,
    })),
  } satisfies MediaVerifier
}

const fakeWarm = () =>
  ({
    forContent: vi.fn<WarmScheduler['forContent']>(async () => {}),
    forPin: vi.fn<WarmScheduler['forPin']>(async () => {}),
  }) satisfies WarmScheduler

const validCreateInput = {
  contentId: CONTENT_ID,
  ratio: '1:1' as const,
  label: 'Pin de ejemplo',
  language: 'es' as const,
  autoplayMode: null,
  alt: 'Alt',
}

describe('createPin', () => {
  it('valida y delega en pins.create', async () => {
    const pins = fakePins()
    const createPin = makeCreatePin({ pins })

    const result = await createPin(validCreateInput)

    expect(result).toBe(PIN_ID)
    expect(pins.create).toHaveBeenCalledOnce()
  })

  it('rechaza un alt vacío sin llamar al repositorio', async () => {
    const pins = fakePins()
    const createPin = makeCreatePin({ pins })

    await expect(createPin({ ...validCreateInput, alt: '' })).rejects.toThrow()

    expect(pins.create).not.toHaveBeenCalled()
  })
})

describe('updatePin', () => {
  it('valida y delega en pins.update', async () => {
    const pins = fakePins()
    const updatePin = makeUpdatePin({ pins })

    const result = await updatePin({
      id: PIN_ID,
      ratio: '4:5',
      label: 'Actualizado',
      language: 'es',
      autoplayMode: null,
      alt: 'Alt actualizado',
    })

    expect(result).toBe(PIN_ID)
    expect(pins.update).toHaveBeenCalledOnce()
  })
})

describe('deletePin', () => {
  it('lee los medios ANTES de borrar y purga después', async () => {
    const pins = fakePins()
    const cleanup = fakeCleanup()
    const refs = [
      {
        mediaId: MEDIA_ID,
        cloudinaryPublicId: 'greener/content/a',
        kind: 'image' as const,
      },
    ]
    const order: string[] = []
    cleanup.snapshotPinMedia.mockImplementation(async () => {
      order.push('snapshot')
      return refs
    })
    pins.delete.mockImplementation(async () => {
      order.push('delete')
      return PIN_ID
    })
    cleanup.purgeRemovedMedia.mockImplementation(async () => {
      order.push('purge')
      return { purged: 1, failed: 0 }
    })
    const deletePin = makeDeletePin({ pins, cleanup })

    const result = await deletePin({ id: PIN_ID })

    expect(result).toEqual({ purged: 1, failed: 0 })
    expect(pins.delete).toHaveBeenCalledWith({ id: PIN_ID })
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith(refs)
    expect(order).toEqual(['snapshot', 'delete', 'purge'])
  })

  it('si la base de datos rechaza el borrado, lanza y no purga', async () => {
    const pins = fakePins()
    const cleanup = fakeCleanup()
    pins.delete.mockRejectedValue(new Error('x'))
    const deletePin = makeDeletePin({ pins, cleanup })

    await expect(deletePin({ id: PIN_ID })).rejects.toThrow('x')

    expect(cleanup.purgeRemovedMedia).not.toHaveBeenCalled()
  })
})

describe('deleteAllPins', () => {
  const listItem = (id: string) =>
    ({ id, contentId: CONTENT_ID, media: null }) as never

  it('borra todos los pines y purga los archivos de los borrados', async () => {
    const pins = fakePins()
    const cleanup = fakeCleanup()
    const idA = '11111111-1111-4111-8111-111111111111'
    const idB = '22222222-2222-4222-8222-222222222222'
    pins.listByContentId.mockResolvedValue([listItem(idA), listItem(idB)])
    cleanup.snapshotPinMedia.mockImplementation(async (id) => [
      {
        mediaId: `m-${id}`,
        cloudinaryPublicId: `greener/content/${id}`,
        kind: 'image',
      },
    ])
    cleanup.purgeRemovedMedia.mockResolvedValue({ purged: 2, failed: 0 })
    const deleteAllPins = makeDeleteAllPins({ pins, cleanup })

    const result = await deleteAllPins(CONTENT_ID)

    expect(result).toEqual({
      total: 2,
      deleted: 2,
      stopped: false,
      purge: { purged: 2, failed: 0 },
    })
    expect(pins.delete).toHaveBeenCalledTimes(2)
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith([
      {
        mediaId: `m-${idA}`,
        cloudinaryPublicId: `greener/content/${idA}`,
        kind: 'image',
      },
      {
        mediaId: `m-${idB}`,
        cloudinaryPublicId: `greener/content/${idB}`,
        kind: 'image',
      },
    ])
  })

  it('si uno falla se detiene, y los archivos de los ya borrados se purgan igual', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const pins = fakePins()
    const cleanup = fakeCleanup()
    const idA = '11111111-1111-4111-8111-111111111111'
    const idB = '22222222-2222-4222-8222-222222222222'
    const idC = '33333333-3333-4333-8333-333333333333'
    pins.listByContentId.mockResolvedValue([
      listItem(idA),
      listItem(idB),
      listItem(idC),
    ])
    cleanup.snapshotPinMedia.mockImplementation(async (id) => [
      {
        mediaId: `m-${id}`,
        cloudinaryPublicId: `greener/content/${id}`,
        kind: 'image',
      },
    ])
    pins.delete.mockResolvedValueOnce(idA).mockRejectedValueOnce(new Error('x'))
    const deleteAllPins = makeDeleteAllPins({ pins, cleanup })

    const result = await deleteAllPins(CONTENT_ID)

    expect(result).toMatchObject({ total: 3, deleted: 1, stopped: true })
    expect(pins.delete).toHaveBeenCalledTimes(2)
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith([
      {
        mediaId: `m-${idA}`,
        cloudinaryPublicId: `greener/content/${idA}`,
        kind: 'image',
      },
    ])
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
  }

  it('verifica, valida y delega en pinMedia.attachImage', async () => {
    const pinMedia = fakePinMedia()
    const verifier = fakeVerifier()
    const attachPinImage = makeAttachPinImage({ pinMedia, verifier })

    const result = await attachPinImage(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(verifier.verifyImage).toHaveBeenCalledWith('greener/content/abc123')
    expect(pinMedia.attachImage).toHaveBeenCalledWith(validInput)
  })

  it('ignora un slideOrder heredado: un pin es un único medio y no hay orden', async () => {
    const pinMedia = fakePinMedia()
    const attachPinImage = makeAttachPinImage({
      pinMedia,
      verifier: fakeVerifier(),
    })

    await attachPinImage({ ...validInput, slideOrder: 9 } as typeof validInput)

    expect(pinMedia.attachImage).toHaveBeenCalledWith(validInput)
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

  it('valida, delega en pinMedia.attachVideo y encarga el calentamiento del pin', async () => {
    const pinMedia = fakePinMedia()
    const warm = fakeWarm()
    const attachPinVideo = makeAttachPinVideo({
      pinMedia,
      verifier: fakeVerifier(),
      warm,
    })

    const result = await attachPinVideo(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(pinMedia.attachVideo).toHaveBeenCalledOnce()
    expect(warm.forPin).toHaveBeenCalledWith(PIN_ID)
  })

  it('rechaza más de 15 segundos (techo absoluto, el de las tools) sin llamar al repositorio ni calentar', async () => {
    const pinMedia = fakePinMedia()
    const warm = fakeWarm()
    const attachPinVideo = makeAttachPinVideo({
      pinMedia,
      verifier: fakeVerifier({}, { durationSeconds: 16 }),
      warm,
    })

    await expect(
      attachPinVideo({ ...validInput, durationSeconds: 16 }),
    ).rejects.toThrow()

    expect(pinMedia.attachVideo).not.toHaveBeenCalled()
    expect(warm.forPin).not.toHaveBeenCalled()
  })
})

describe('detachPinMedia', () => {
  const input = {
    pinId: PIN_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    kind: 'image' as const,
  }

  it('lee el medio de la base ANTES de desvincular y purga lo leído', async () => {
    const pinMedia = fakePinMedia()
    const cleanup = fakeCleanup()
    const refs = [
      {
        mediaId: MEDIA_ID,
        cloudinaryPublicId: 'greener/content/de-la-base',
        kind: 'image' as const,
      },
    ]
    const order: string[] = []
    cleanup.snapshotMedia.mockImplementation(async () => {
      order.push('snapshot')
      return refs
    })
    pinMedia.detach.mockImplementation(async () => {
      order.push('detach')
      return MEDIA_ID
    })
    cleanup.purgeRemovedMedia.mockImplementation(async () => {
      order.push('purge')
      return { purged: 1, failed: 0 }
    })
    const detachPinMedia = makeDetachPinMedia({ pinMedia, cleanup })

    const result = await detachPinMedia(input)

    expect(result).toEqual({ purged: 1, failed: 0 })
    expect(cleanup.snapshotMedia).toHaveBeenCalledWith([MEDIA_ID])
    expect(pinMedia.detach).toHaveBeenCalledWith(input)
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith(refs)
    expect(order).toEqual(['snapshot', 'detach', 'purge'])
  })
})

describe('createPinWithImage / createPinWithVideo', () => {
  const pin = validCreateInput

  it('imagen: verifica, crea el pin y le adjunta el medio', async () => {
    const pins = fakePins()
    const pinMedia = fakePinMedia()
    const verifier = fakeVerifier()
    const createPinWithImage = makeCreatePinWithImage({
      pins,
      pinMedia,
      verifier,
    })

    const result = await createPinWithImage({
      pin,
      cloudinaryPublicId: 'greener/content/abc123',
    })

    expect(result).toEqual({ pinId: PIN_ID, mediaId: MEDIA_ID })
    expect(pinMedia.attachImage).toHaveBeenCalledWith(
      expect.objectContaining({ pinId: PIN_ID, width: 1200 }),
    )
  })

  it('imagen: si el archivo no verifica, no se crea el pin', async () => {
    const pins = fakePins()
    const verifier = fakeVerifier()
    verifier.verifyImage.mockRejectedValue(new Error('no existe'))
    const createPinWithImage = makeCreatePinWithImage({
      pins,
      pinMedia: fakePinMedia(),
      verifier,
    })

    await expect(
      createPinWithImage({ pin, cloudinaryPublicId: 'greener/content/x' }),
    ).rejects.toMatchObject({ stage: 'verify' })

    expect(pins.create).not.toHaveBeenCalled()
  })

  it('imagen: si adjuntar falla, descarta el pin recién creado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const pins = fakePins()
    const pinMedia = fakePinMedia()
    pinMedia.attachImage.mockRejectedValue(new Error('rpc'))
    const createPinWithImage = makeCreatePinWithImage({
      pins,
      pinMedia,
      verifier: fakeVerifier(),
    })

    const error = await createPinWithImage({
      pin,
      cloudinaryPublicId: 'greener/content/x',
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(CreatePinWithMediaError)
    expect(error).toMatchObject({ stage: 'attach' })
    expect(pins.delete).toHaveBeenCalledWith({ id: PIN_ID })
  })

  it('vídeo: crea el pin, adjunta y encarga el calentamiento del contenido', async () => {
    const pins = fakePins()
    const pinMedia = fakePinMedia()
    const warm = fakeWarm()
    const createPinWithVideo = makeCreatePinWithVideo({
      pins,
      pinMedia,
      verifier: fakeVerifier(),
      warm,
    })

    const result = await createPinWithVideo({
      pin,
      video: {
        cloudinaryPublicId: 'greener/content/videos/abc123',
        format: 'mp4',
        width: 1080,
        height: 1080,
        durationSeconds: 3,
        bytes: 2 * 1024 * 1024,
      },
    })

    expect(result).toEqual({ pinId: PIN_ID, mediaId: MEDIA_ID })
    expect(warm.forContent).toHaveBeenCalledWith(CONTENT_ID)
  })

  it('vídeo: si adjuntar falla, descarta el pin y no calienta', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const pins = fakePins()
    const pinMedia = fakePinMedia()
    pinMedia.attachVideo.mockRejectedValue(new Error('rpc'))
    const warm = fakeWarm()
    const createPinWithVideo = makeCreatePinWithVideo({
      pins,
      pinMedia,
      verifier: fakeVerifier(),
      warm,
    })

    await expect(
      createPinWithVideo({
        pin,
        video: {
          cloudinaryPublicId: 'greener/content/videos/abc123',
          format: 'mp4',
          width: 1080,
          height: 1080,
          durationSeconds: 3,
          bytes: 2 * 1024 * 1024,
        },
      }),
    ).rejects.toMatchObject({ stage: 'attach' })

    expect(pins.delete).toHaveBeenCalledWith({ id: PIN_ID })
    expect(warm.forContent).not.toHaveBeenCalled()
  })
})

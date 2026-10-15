import { describe, it, expect, vi } from 'vitest'

import {
  makeAddCaseCarouselImage,
  makeAddCaseCarouselVideo,
} from '@/modules/content/application/addCaseCarouselMedia'
import {
  makeRemoveAllCaseCarouselMedia,
  makeRemoveCaseCarouselMedia,
} from '@/modules/content/application/removeCaseCarouselMedia'
import type {
  CaseCarouselItem,
  CaseCarouselRepository,
} from '@/modules/content/domain/caseCarouselRepository'
import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import type { MediaCleanup } from '@/modules/media/domain/mediaCleanupPorts'
import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'

/** Carrusel de un caso (§3, §6): casos de uso con puertos falsos. */

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

function fakeMedia() {
  return {
    addCaseCarouselImage: vi.fn<MediaAssetRepository['addCaseCarouselImage']>(
      async () => MEDIA_ID,
    ),
    addCaseCarouselVideo: vi.fn<MediaAssetRepository['addCaseCarouselVideo']>(
      async () => MEDIA_ID,
    ),
    removeCaseCarouselMedia: vi.fn<
      MediaAssetRepository['removeCaseCarouselMedia']
    >(async () => MEDIA_ID),
  } satisfies MediaAssetRepository
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

function fakeVerifier(durationSeconds = 45) {
  return {
    verifyImage: vi.fn<MediaVerifier['verifyImage']>(async (publicId) => ({
      cloudinaryPublicId: publicId,
      format: 'webp',
      width: 1200,
      height: 800,
      bytes: 500_000,
    })),
    verifyVideo: vi.fn<MediaVerifier['verifyVideo']>(async (publicId) => ({
      cloudinaryPublicId: publicId,
      format: 'mp4',
      width: 1920,
      height: 1080,
      durationSeconds,
      bytes: 20 * 1024 * 1024,
    })),
  } satisfies MediaVerifier
}

const warm = (): WarmScheduler => ({
  forContent: vi.fn(async () => {}),
  forPin: vi.fn(async () => {}),
})

describe('addCaseCarouselImage', () => {
  const input = {
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
    sortOrder: 0,
    alt: 'Equipo de Agróptimum en el campo',
  }

  it('verifica, valida con zod y delega en el repositorio', async () => {
    const media = fakeMedia()
    const verifier = fakeVerifier()
    const addCaseCarouselImage = makeAddCaseCarouselImage({ media, verifier })

    const result = await addCaseCarouselImage(input)

    expect(result).toBe(MEDIA_ID)
    expect(verifier.verifyImage).toHaveBeenCalledWith('greener/content/abc123')
    expect(media.addCaseCarouselImage).toHaveBeenCalledWith(input)
  })
})

describe('addCaseCarouselVideo', () => {
  const input = {
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 45,
    bytes: 20 * 1024 * 1024,
    sortOrder: 0,
    alt: 'Vídeo del equipo de Agróptimum',
  }

  it('rechaza más de 180 s sin llamar al repositorio ni calentar', async () => {
    const media = fakeMedia()
    const scheduler = warm()
    const addCaseCarouselVideo = makeAddCaseCarouselVideo({
      media,
      verifier: fakeVerifier(200),
      warm: scheduler,
    })

    await expect(
      addCaseCarouselVideo({ ...input, durationSeconds: 200 }),
    ).rejects.toThrow()

    expect(media.addCaseCarouselVideo).not.toHaveBeenCalled()
    expect(scheduler.forContent).not.toHaveBeenCalled()
  })

  it('registra el vídeo y encarga el calentamiento del contenido', async () => {
    const media = fakeMedia()
    const scheduler = warm()
    const addCaseCarouselVideo = makeAddCaseCarouselVideo({
      media,
      verifier: fakeVerifier(),
      warm: scheduler,
    })

    const result = await addCaseCarouselVideo(input)

    expect(result).toBe(MEDIA_ID)
    expect(media.addCaseCarouselVideo).toHaveBeenCalledWith(input)
    expect(scheduler.forContent).toHaveBeenCalledWith(CONTENT_ID)
  })
})

describe('removeCaseCarouselMedia', () => {
  const input = {
    contentId: CONTENT_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    kind: 'image' as const,
  }

  it('lee el medio de la base ANTES de quitarlo y purga después', async () => {
    const media = fakeMedia()
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
    media.removeCaseCarouselMedia.mockImplementation(async () => {
      order.push('remove')
      return MEDIA_ID
    })
    cleanup.purgeRemovedMedia.mockImplementation(async () => {
      order.push('purge')
      return { purged: 1, failed: 0 }
    })
    const removeCaseCarouselMedia = makeRemoveCaseCarouselMedia({
      media,
      cleanup,
    })

    const result = await removeCaseCarouselMedia(input)

    expect(result).toEqual({ purged: 1, failed: 0 })
    expect(media.removeCaseCarouselMedia).toHaveBeenCalledWith(input)
    // Se purga lo leído de la base, nunca el public id del navegador.
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith(refs)
    expect(order).toEqual(['snapshot', 'remove', 'purge'])
  })

  it('rechaza un mediaId inválido sin tocar nada', async () => {
    const media = fakeMedia()
    const cleanup = fakeCleanup()
    const removeCaseCarouselMedia = makeRemoveCaseCarouselMedia({
      media,
      cleanup,
    })

    await expect(
      removeCaseCarouselMedia({ ...input, mediaId: 'no-es-uuid' }),
    ).rejects.toThrow()

    expect(media.removeCaseCarouselMedia).not.toHaveBeenCalled()
    expect(cleanup.snapshotMedia).not.toHaveBeenCalled()
  })
})

describe('removeAllCaseCarouselMedia', () => {
  const item = (n: number): CaseCarouselItem => ({
    mediaId: `m${n}`,
    kind: 'image',
    cloudinaryPublicId: `greener/content/${n}`,
    sortOrder: n,
    alt: `alt ${n}`,
  })

  function setup(items: CaseCarouselItem[]) {
    const carousels: CaseCarouselRepository = {
      listByContentId: vi.fn(async () => items),
    }
    const media = fakeMedia()
    const cleanup = fakeCleanup()
    const removeAll = makeRemoveAllCaseCarouselMedia({
      carousels,
      media,
      cleanup,
    })

    return { carousels, media, cleanup, removeAll }
  }

  it('quita todas las diapositivas y purga sus archivos', async () => {
    const { media, cleanup, removeAll } = setup([item(1), item(2)])
    cleanup.purgeRemovedMedia.mockResolvedValue({ purged: 2, failed: 0 })

    const result = await removeAll(CONTENT_ID)

    expect(result).toEqual({
      total: 2,
      removed: 2,
      interrupted: false,
      purge: { purged: 2, failed: 0 },
    })
    expect(media.removeCaseCarouselMedia).toHaveBeenCalledTimes(2)
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith([
      { mediaId: 'm1', cloudinaryPublicId: 'greener/content/1', kind: 'image' },
      { mediaId: 'm2', cloudinaryPublicId: 'greener/content/2', kind: 'image' },
    ])
  })

  it('si una falla, se detiene, avisa y purga solo las ya quitadas', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { media, cleanup, removeAll } = setup([item(1), item(2), item(3)])
    media.removeCaseCarouselMedia
      .mockResolvedValueOnce(MEDIA_ID)
      .mockRejectedValueOnce(new Error('en uso'))

    const result = await removeAll(CONTENT_ID)

    expect(result).toMatchObject({ total: 3, removed: 1, interrupted: true })
    expect(media.removeCaseCarouselMedia).toHaveBeenCalledTimes(2)
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith([
      { mediaId: 'm1', cloudinaryPublicId: 'greener/content/1', kind: 'image' },
    ])
  })

  it('sin diapositivas no quita ni purga nada relevante', async () => {
    const { media, removeAll } = setup([])

    const result = await removeAll(CONTENT_ID)

    expect(result).toMatchObject({ total: 0, removed: 0, interrupted: false })
    expect(media.removeCaseCarouselMedia).not.toHaveBeenCalled()
  })
})

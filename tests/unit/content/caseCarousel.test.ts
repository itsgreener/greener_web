import { describe, it, expect, vi } from 'vitest'

import {
  makeAddCaseCarouselImage,
  makeAddCaseCarouselVideo,
} from '@/modules/content/application/addCaseCarouselMedia'
import { makeReorderCaseCarousel } from '@/modules/content/application/reorderCaseCarousel'
import {
  makeReplaceCaseCarouselImage,
  makeReplaceCaseCarouselVideo,
} from '@/modules/content/application/replaceCaseCarouselMedia'
import { makeUpdateCaseCarouselAlt } from '@/modules/content/application/updateCaseCarouselAlt'
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
const NEW_MEDIA_ID = '1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d'

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
    replaceCaseCarouselMedia: vi.fn<
      MediaAssetRepository['replaceCaseCarouselMedia']
    >(async () => NEW_MEDIA_ID),
    updateCaseCarouselAlt: vi.fn<MediaAssetRepository['updateCaseCarouselAlt']>(
      async () => MEDIA_ID,
    ),
    reorderCaseCarousel: vi.fn<MediaAssetRepository['reorderCaseCarousel']>(
      async (input) => input.mediaIds.length,
    ),
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

  it('rechaza más de 300 s sin llamar al repositorio ni calentar', async () => {
    const media = fakeMedia()
    const scheduler = warm()
    const addCaseCarouselVideo = makeAddCaseCarouselVideo({
      media,
      verifier: fakeVerifier(320),
      warm: scheduler,
    })

    await expect(
      addCaseCarouselVideo({ ...input, durationSeconds: 320 }),
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

describe('replaceCaseCarouselImage', () => {
  const input = {
    contentId: CONTENT_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/nueva',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
    alt: 'New team photo in the field',
  }

  function setup() {
    const media = fakeMedia()
    const cleanup = fakeCleanup()
    const verifier = fakeVerifier()
    const replace = makeReplaceCaseCarouselImage({ media, verifier, cleanup })

    return { media, cleanup, verifier, replace }
  }

  it('lee el archivo anterior de la base ANTES de sustituir y lo purga DESPUÉS', async () => {
    const { media, cleanup, replace } = setup()
    const previous = [
      {
        mediaId: MEDIA_ID,
        cloudinaryPublicId: 'greener/content/anterior',
        kind: 'image' as const,
      },
    ]
    const order: string[] = []
    cleanup.snapshotMedia.mockImplementation(async () => {
      order.push('snapshot')
      return previous
    })
    media.replaceCaseCarouselMedia.mockImplementation(async () => {
      order.push('replace')
      return NEW_MEDIA_ID
    })
    cleanup.purgeRemovedMedia.mockImplementation(async () => {
      order.push('purge')
      return { purged: 1, failed: 0 }
    })

    const result = await replace(input)

    expect(result).toEqual({
      mediaId: NEW_MEDIA_ID,
      purge: { purged: 1, failed: 0 },
    })
    expect(cleanup.snapshotMedia).toHaveBeenCalledWith([MEDIA_ID])
    // Se purga lo leído de la base, nunca algo que venga del navegador.
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith(previous)
    expect(order).toEqual(['snapshot', 'replace', 'purge'])
  })

  it('registra lo que mide Cloudinary, no lo que dice el navegador', async () => {
    const { media, verifier, replace } = setup()

    await replace({ ...input, width: 10, height: 10, bytes: 10 })

    expect(verifier.verifyImage).toHaveBeenCalledWith('greener/content/nueva')
    expect(media.replaceCaseCarouselMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'image',
        width: 1200,
        height: 800,
        bytes: 500_000,
        mediaId: MEDIA_ID,
        alt: 'New team photo in the field',
      }),
    )
  })

  it('si no pudo leer el archivo anterior, lo cuenta como borrado fallido', async () => {
    const { cleanup, replace } = setup()
    cleanup.snapshotMedia.mockResolvedValue([])

    const result = await replace(input)

    expect(result.purge).toEqual({ purged: 0, failed: 1 })
    expect(cleanup.purgeRemovedMedia).not.toHaveBeenCalled()
  })

  it('si la base rechaza la sustitución, no purga nada', async () => {
    const { media, cleanup, replace } = setup()
    cleanup.snapshotMedia.mockResolvedValue([
      {
        mediaId: MEDIA_ID,
        cloudinaryPublicId: 'greener/content/anterior',
        kind: 'image',
      },
    ])
    media.replaceCaseCarouselMedia.mockRejectedValue(new Error('ZG014'))

    await expect(replace(input)).rejects.toThrow('ZG014')

    expect(cleanup.purgeRemovedMedia).not.toHaveBeenCalled()
  })

  it('rechaza un alt vacío o un mediaId inválido sin tocar nada', async () => {
    const { media, cleanup, replace } = setup()

    await expect(replace({ ...input, alt: '   ' })).rejects.toThrow()
    await expect(replace({ ...input, mediaId: 'no-es-uuid' })).rejects.toThrow()

    expect(cleanup.snapshotMedia).not.toHaveBeenCalled()
    expect(media.replaceCaseCarouselMedia).not.toHaveBeenCalled()
  })
})

describe('replaceCaseCarouselVideo', () => {
  const input = {
    contentId: CONTENT_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/videos/nuevo',
    format: 'mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 45,
    bytes: 20 * 1024 * 1024,
    alt: 'New video of the team',
  }

  function setup(durationSeconds = 45) {
    const media = fakeMedia()
    const cleanup = fakeCleanup()
    const scheduler = warm()
    const replace = makeReplaceCaseCarouselVideo({
      media,
      verifier: fakeVerifier(durationSeconds),
      cleanup,
      warm: scheduler,
    })

    return { media, cleanup, scheduler, replace }
  }

  it('sustituye, encarga el calentamiento y purga el anterior', async () => {
    const { media, cleanup, scheduler, replace } = setup()
    cleanup.snapshotMedia.mockResolvedValue([
      {
        mediaId: MEDIA_ID,
        cloudinaryPublicId: 'greener/content/anterior',
        kind: 'image',
      },
    ])
    cleanup.purgeRemovedMedia.mockResolvedValue({ purged: 1, failed: 0 })

    const result = await replace(input)

    expect(result.purge).toEqual({ purged: 1, failed: 0 })
    expect(media.replaceCaseCarouselMedia).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'video', durationSeconds: 45 }),
    )
    expect(scheduler.forContent).toHaveBeenCalledWith(CONTENT_ID)
  })

  it('rechaza más de 300 s sin sustituir, calentar ni purgar', async () => {
    const { media, cleanup, scheduler, replace } = setup(320)

    await expect(replace({ ...input, durationSeconds: 320 })).rejects.toThrow()

    expect(media.replaceCaseCarouselMedia).not.toHaveBeenCalled()
    expect(scheduler.forContent).not.toHaveBeenCalled()
    expect(cleanup.purgeRemovedMedia).not.toHaveBeenCalled()
  })
})

describe('updateCaseCarouselAlt', () => {
  it('recorta el alt y delega en el repositorio', async () => {
    const media = fakeMedia()
    const update = makeUpdateCaseCarouselAlt({ media })

    await update({ contentId: CONTENT_ID, mediaId: MEDIA_ID, alt: '  Nuevo  ' })

    expect(media.updateCaseCarouselAlt).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      mediaId: MEDIA_ID,
      alt: 'Nuevo',
    })
  })

  it('rechaza un alt en blanco sin llamar al repositorio', async () => {
    const media = fakeMedia()
    const update = makeUpdateCaseCarouselAlt({ media })

    await expect(
      update({ contentId: CONTENT_ID, mediaId: MEDIA_ID, alt: '   ' }),
    ).rejects.toThrow()

    expect(media.updateCaseCarouselAlt).not.toHaveBeenCalled()
  })
})

describe('reorderCaseCarousel', () => {
  it('pasa la lista completa de ids al repositorio', async () => {
    const media = fakeMedia()
    const reorder = makeReorderCaseCarousel({ media })

    const result = await reorder({
      contentId: CONTENT_ID,
      mediaIds: [NEW_MEDIA_ID, MEDIA_ID],
    })

    expect(result).toBe(2)
    expect(media.reorderCaseCarousel).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      mediaIds: [NEW_MEDIA_ID, MEDIA_ID],
    })
  })

  it('rechaza una lista vacía o con ids que no son uuid', async () => {
    const media = fakeMedia()
    const reorder = makeReorderCaseCarousel({ media })

    await expect(
      reorder({ contentId: CONTENT_ID, mediaIds: [] }),
    ).rejects.toThrow()
    await expect(
      reorder({ contentId: CONTENT_ID, mediaIds: ['x'] }),
    ).rejects.toThrow()

    expect(media.reorderCaseCarousel).not.toHaveBeenCalled()
  })
})

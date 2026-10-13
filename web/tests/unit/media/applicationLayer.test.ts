import { describe, it, expect, vi } from 'vitest'

import { makeDeleteCoverMedia } from '@/modules/media/application/deleteCoverMedia'
import { makeRegisterCoverImage } from '@/modules/media/application/registerCoverImage'
import { makeRegisterCoverVideo } from '@/modules/media/application/registerCoverVideo'
import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import type { MediaCleanup } from '@/modules/media/domain/mediaCleanupPorts'
import {
  ImageVerificationError,
  type MediaVerifier,
} from '@/modules/media/domain/mediaVerification'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'

/**
 * Los casos de uso de media reciben repositorio, verificador y calentador por
 * parámetro (`makeX({ … })`): se prueban con fakes, sin mockear módulos.
 * El verificador de los tests devuelve los metadatos «reales» que se le
 * configuran; así se comprueba que mandan ellos y no los del navegador.
 */

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const MEDIA_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

function fakeMedia() {
  return {
    registerCoverImage: vi.fn<MediaAssetRepository['registerCoverImage']>(
      async () => MEDIA_ID,
    ),
    registerCoverVideo: vi.fn<MediaAssetRepository['registerCoverVideo']>(
      async () => MEDIA_ID,
    ),
    unlinkAndDeleteCoverMedia: vi.fn<
      MediaAssetRepository['unlinkAndDeleteCoverMedia']
    >(async () => MEDIA_ID),
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

function fakeVerifier(
  image: Partial<Awaited<ReturnType<MediaVerifier['verifyImage']>>> = {},
  video: Partial<Awaited<ReturnType<MediaVerifier['verifyVideo']>>> = {},
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
      width: 1920,
      height: 1080,
      durationSeconds: 45,
      bytes: 20 * 1024 * 1024,
      ...video,
    })),
  } satisfies MediaVerifier
}

function fakeWarm() {
  return {
    forContent: vi.fn<WarmScheduler['forContent']>(async () => {}),
    forPin: vi.fn<WarmScheduler['forPin']>(async () => {}),
  } satisfies WarmScheduler
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

describe('registerCoverImage', () => {
  const validInput = {
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    format: 'webp',
    width: 1200,
    height: 800,
    bytes: 500_000,
    ratio: '4:3' as const,
  }

  it('verifica el archivo, valida con zod y delega en el repositorio', async () => {
    const media = fakeMedia()
    const verifier = fakeVerifier()
    const registerCoverImage = makeRegisterCoverImage({ media, verifier })

    const result = await registerCoverImage(validInput)

    expect(result).toBe(MEDIA_ID)
    expect(verifier.verifyImage).toHaveBeenCalledWith('greener/content/abc123')
    expect(media.registerCoverImage).toHaveBeenCalledWith(validInput)
  })

  it('los metadatos que mandan son los del archivo real, no los del navegador', async () => {
    const media = fakeMedia()
    const verifier = fakeVerifier({ width: 2400, height: 1600, bytes: 900_000 })
    const registerCoverImage = makeRegisterCoverImage({ media, verifier })

    await registerCoverImage({ ...validInput, width: 10, height: 10, bytes: 1 })

    expect(media.registerCoverImage).toHaveBeenCalledWith({
      ...validInput,
      width: 2400,
      height: 1600,
      bytes: 900_000,
    })
  })

  it('rechaza dimensiones inválidas (width 0) sin llamar al repositorio', async () => {
    const media = fakeMedia()
    const verifier = fakeVerifier({ width: 0 })
    const registerCoverImage = makeRegisterCoverImage({ media, verifier })

    await expect(registerCoverImage(validInput)).rejects.toThrow()

    expect(media.registerCoverImage).not.toHaveBeenCalled()
  })

  it('si el archivo no es válido, propaga el error de verificación y no registra nada', async () => {
    const media = fakeMedia()
    const verifier = fakeVerifier()
    verifier.verifyImage.mockRejectedValue(
      new ImageVerificationError('no existe'),
    )
    const registerCoverImage = makeRegisterCoverImage({ media, verifier })

    await expect(registerCoverImage(validInput)).rejects.toBeInstanceOf(
      ImageVerificationError,
    )

    expect(media.registerCoverImage).not.toHaveBeenCalled()
  })
})

describe('registerCoverVideo — solo other (especificacion-final-formato-detalle.md §3)', () => {
  const validInput = {
    contentId: CONTENT_ID,
    cloudinaryPublicId: 'greener/content/videos/abc123',
    format: 'mp4',
    width: 1920,
    height: 1080,
    durationSeconds: 45,
    bytes: 20 * 1024 * 1024,
    ratio: '16:9' as const,
  }

  it('valida con zod (incluida la transformación de duración), delega y encarga el calentamiento', async () => {
    const media = fakeMedia()
    const warm = fakeWarm()
    const verifier = fakeVerifier({}, { durationSeconds: 44.3 })
    const registerCoverVideo = makeRegisterCoverVideo({
      media,
      verifier,
      warm,
    })

    const result = await registerCoverVideo({
      ...validInput,
      durationSeconds: 44.3,
    })

    expect(result).toBe(MEDIA_ID)
    expect(verifier.verifyVideo).toHaveBeenCalledWith(
      'greener/content/videos/abc123',
      44.3,
    )
    expect(media.registerCoverVideo).toHaveBeenCalledWith({
      ...validInput,
      durationSeconds: 45,
    })
    expect(warm.forContent).toHaveBeenCalledWith(CONTENT_ID)
  })

  it('rechaza un vídeo de más de 180 s sin llamar al repositorio ni calentar', async () => {
    const media = fakeMedia()
    const warm = fakeWarm()
    const verifier = fakeVerifier({}, { durationSeconds: 200 })
    const registerCoverVideo = makeRegisterCoverVideo({
      media,
      verifier,
      warm,
    })

    await expect(
      registerCoverVideo({ ...validInput, durationSeconds: 200 }),
    ).rejects.toThrow()

    expect(media.registerCoverVideo).not.toHaveBeenCalled()
    expect(warm.forContent).not.toHaveBeenCalled()
  })
})

describe('deleteCoverMedia', () => {
  const validInput = {
    contentId: CONTENT_ID,
    mediaId: MEDIA_ID,
    cloudinaryPublicId: 'greener/content/abc123',
    kind: 'image' as const,
  }

  it('lee los medios ANTES de desvincular y purga después los archivos', async () => {
    const media = fakeMedia()
    const cleanup = fakeCleanup()
    const refs = [
      {
        mediaId: MEDIA_ID,
        cloudinaryPublicId: 'greener/content/abc123',
        kind: 'image' as const,
      },
    ]
    const order: string[] = []
    cleanup.snapshotMedia.mockImplementation(async () => {
      order.push('snapshot')
      return refs
    })
    media.unlinkAndDeleteCoverMedia.mockImplementation(async () => {
      order.push('unlink')
      return MEDIA_ID
    })
    cleanup.purgeRemovedMedia.mockImplementation(async () => {
      order.push('purge')
      return { purged: 1, failed: 0 }
    })
    const deleteCoverMedia = makeDeleteCoverMedia({ media, cleanup })

    const result = await deleteCoverMedia(validInput)

    expect(result).toEqual({ purged: 1, failed: 0 })
    expect(cleanup.snapshotMedia).toHaveBeenCalledWith([MEDIA_ID])
    expect(media.unlinkAndDeleteCoverMedia).toHaveBeenCalledWith(validInput)
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith(refs)
    expect(order).toEqual(['snapshot', 'unlink', 'purge'])
  })

  it('rechaza un mediaId inválido sin llamar al repositorio', async () => {
    const media = fakeMedia()
    const cleanup = fakeCleanup()
    const deleteCoverMedia = makeDeleteCoverMedia({ media, cleanup })

    await expect(
      deleteCoverMedia({ ...validInput, mediaId: 'no-es-uuid' }),
    ).rejects.toThrow()

    expect(media.unlinkAndDeleteCoverMedia).not.toHaveBeenCalled()
    expect(cleanup.snapshotMedia).not.toHaveBeenCalled()
  })

  it('si la base de datos falla, lanza y no purga ningún archivo', async () => {
    const media = fakeMedia()
    const cleanup = fakeCleanup()
    media.unlinkAndDeleteCoverMedia.mockRejectedValue(new Error('en uso'))
    const deleteCoverMedia = makeDeleteCoverMedia({ media, cleanup })

    await expect(deleteCoverMedia(validInput)).rejects.toThrow('en uso')

    expect(cleanup.purgeRemovedMedia).not.toHaveBeenCalled()
  })
})

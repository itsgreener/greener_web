import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import {
  replaceCaseCarouselImageSchema,
  replaceCaseCarouselVideoSchema,
  type ReplaceCaseCarouselImageInput,
  type ReplaceCaseCarouselVideoInput,
} from '@/modules/media/domain/mediaAssetSchema'
import type {
  MediaCleanup,
  PurgeResult,
} from '@/modules/media/domain/mediaCleanupPorts'
import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'

export interface ReplaceCaseCarouselResult {
  /** Id del `media_asset` nuevo. */
  mediaId: string
  /** Borrado del archivo anterior en Cloudinary. */
  purge: PurgeResult
}

/**
 * El archivo anterior se lee de la base de datos ANTES de sustituir (nunca
 * del navegador, auditoría 8 oct P0-2) y se borra DESPUÉS, solo si ya no lo
 * referencia nadie. Si no se pudo leer cuál era, no se puede borrar: se
 * cuenta como fallo para que el ABM avise, en vez de dejar un archivo suelto
 * sin que nadie se entere (lo recoge el reconciliador).
 */
async function purgePrevious(
  cleanup: MediaCleanup,
  previous: Awaited<ReturnType<MediaCleanup['snapshotMedia']>>,
): Promise<PurgeResult> {
  if (previous.length === 0) return { purged: 0, failed: 1 }

  return cleanup.purgeRemovedMedia(previous)
}

/**
 * Sustituye el medio de una diapositiva por una imagen nueva, conservando su
 * posición. Los metadatos salen del archivo real, no de lo que dijo el
 * navegador.
 *
 * @throws ImageVerificationError si el archivo no es válido
 */
export function makeReplaceCaseCarouselImage({
  media,
  verifier,
  cleanup,
}: {
  media: MediaAssetRepository
  verifier: MediaVerifier
  cleanup: MediaCleanup
}) {
  return async function replaceCaseCarouselImage(
    input: ReplaceCaseCarouselImageInput,
  ): Promise<ReplaceCaseCarouselResult> {
    const verified = await verifier.verifyImage(input.cloudinaryPublicId)

    const validated = replaceCaseCarouselImageSchema.parse({
      ...input,
      ...verified,
    })

    const previous = await cleanup.snapshotMedia([validated.mediaId])

    const mediaId = await media.replaceCaseCarouselMedia({
      kind: 'image',
      ...validated,
    })

    return { mediaId, purge: await purgePrevious(cleanup, previous) }
  }
}

/**
 * Sustituye el medio de una diapositiva por un vídeo nuevo y encarga su
 * calentamiento.
 *
 * @throws VideoVerificationError si el archivo no es válido
 */
export function makeReplaceCaseCarouselVideo({
  media,
  verifier,
  cleanup,
  warm,
}: {
  media: MediaAssetRepository
  verifier: MediaVerifier
  cleanup: MediaCleanup
  warm: WarmScheduler
}) {
  return async function replaceCaseCarouselVideo(
    input: ReplaceCaseCarouselVideoInput,
  ): Promise<ReplaceCaseCarouselResult> {
    const verified = await verifier.verifyVideo(
      input.cloudinaryPublicId,
      input.durationSeconds,
    )

    const validated = replaceCaseCarouselVideoSchema.parse({
      ...input,
      ...verified,
    })

    const previous = await cleanup.snapshotMedia([validated.mediaId])

    const mediaId = await media.replaceCaseCarouselMedia({
      kind: 'video',
      ...validated,
    })

    await warm.forContent(validated.contentId)

    return { mediaId, purge: await purgePrevious(cleanup, previous) }
  }
}

import type { MediaAssetRepository } from '@/modules/media/domain/mediaAssetRepository'
import {
  removeCaseCarouselMediaSchema,
  type RemoveCaseCarouselMediaInput,
} from '@/modules/media/domain/mediaAssetSchema'
import type {
  MediaCleanup,
  PurgeResult,
} from '@/modules/media/domain/mediaCleanupPorts'

import type { CaseCarouselRepository } from '@/modules/content/domain/caseCarouselRepository'

/**
 * Quita un medio del carrusel de un caso. El archivo a borrar se lee de la
 * base de datos ANTES de desvincular, nunca del navegador: el public id y
 * el tipo del input no se usan para borrar (auditoría 8 oct, P0-2).
 */
export function makeRemoveCaseCarouselMedia({
  media,
  cleanup,
}: {
  media: MediaAssetRepository
  cleanup: MediaCleanup
}) {
  return async function removeCaseCarouselMedia(
    input: RemoveCaseCarouselMediaInput,
  ): Promise<PurgeResult> {
    const validated = removeCaseCarouselMediaSchema.parse(input)

    const refs = await cleanup.snapshotMedia([validated.mediaId])

    // remove_case_carousel_media ya borra el media_asset en Postgres; el
    // archivo real solo se borra si nadie más lo referencia.
    await media.removeCaseCarouselMedia(validated)

    return cleanup.purgeRemovedMedia(refs)
  }
}

export interface RemoveAllCaseCarouselResult {
  /** Diapositivas que había. */
  total: number
  /** Las que se llegaron a desvincular. */
  removed: number
  /** Si el borrado se detuvo a mitad por un error. */
  interrupted: boolean
  purge: PurgeResult
}

/**
 * Quita TODAS las diapositivas del carrusel. La lista se lee aquí, no se
 * fía de lo que mande el navegador, y cada medio se desvincula igual que al
 * quitarlos de uno en uno.
 *
 * No es atómico entre medios: si uno falla se detiene y el resultado dice
 * cuántos se quitaron (los ya quitados no se restauran). Los archivos de
 * los ya quitados se borran igualmente.
 *
 * @throws si no se puede leer el carrusel
 */
export function makeRemoveAllCaseCarouselMedia({
  carousels,
  media,
  cleanup,
}: {
  carousels: CaseCarouselRepository
  media: MediaAssetRepository
  cleanup: MediaCleanup
}) {
  return async function removeAllCaseCarouselMedia(
    contentId: string,
  ): Promise<RemoveAllCaseCarouselResult> {
    const items = await carousels.listByContentId(contentId)

    const removed: typeof items = []

    let interrupted = false

    for (const item of items) {
      try {
        await media.removeCaseCarouselMedia({
          contentId,
          mediaId: item.mediaId,
          cloudinaryPublicId: item.cloudinaryPublicId,
          kind: item.kind,
        })
      } catch (error) {
        console.error(error)
        interrupted = true
        break
      }

      removed.push(item)
    }

    const purge = await cleanup.purgeRemovedMedia(
      removed.map((item) => ({
        mediaId: item.mediaId,
        cloudinaryPublicId: item.cloudinaryPublicId,
        kind: item.kind,
      })),
    )

    return { total: items.length, removed: removed.length, interrupted, purge }
  }
}

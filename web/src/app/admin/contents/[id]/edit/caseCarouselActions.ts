'use server'

import { warmContentAfterResponse } from '@/modules/media/application/warmAfterResponse'
import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import {
  addCaseCarouselImageSchema,
  addCaseCarouselVideoSchema,
  removeCaseCarouselMediaSchema,
} from '@/modules/media/domain/mediaAssetSchema'

import { addCaseCarouselImage } from '@/modules/media/application/addCaseCarouselImage'
import { addCaseCarouselVideo } from '@/modules/media/application/addCaseCarouselVideo'
import { removeCaseCarouselMedia } from '@/modules/media/application/removeCaseCarouselMedia'
import { getCaseCarousel } from '@/modules/content/application/getCaseCarousel'

import {
  purgeRemovedMedia,
  snapshotContentMedia,
} from '@/modules/media/application/cleanupMedia'

import {
  CloudinaryImageVerificationError,
  CloudinaryVideoVerificationError,
  verifyCloudinaryImageAsset,
  verifyCloudinaryVideoAsset,
} from '@/modules/media/infrastructure/cloudinaryServer'

export type CaseCarouselActionResult =
  { ok: true; mediaId: string } | { ok: false; error: string }

export type RemoveCaseCarouselMediaActionResult =
  { ok: true; warning?: string } | { ok: false; error: string }

function revalidateContent(contentId: string) {
  revalidatePath(`/admin/contents/${contentId}/edit`)
}

export async function addCaseCarouselImageAction(
  input: unknown,
): Promise<CaseCarouselActionResult> {
  const result = addCaseCarouselImageSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos de la imagen no son válidos.',
    }
  }

  try {
    const verified = await verifyCloudinaryImageAsset(
      result.data.cloudinaryPublicId,
    )

    const mediaId = await addCaseCarouselImage({
      ...result.data,
      ...verified,
    })

    revalidateContent(result.data.contentId)

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    if (error instanceof CloudinaryImageVerificationError) {
      return {
        ok: false,
        error: error.message,
      }
    }

    if (
      error instanceof Error &&
      error.message.includes('Image is too large')
    ) {
      return {
        ok: false,
        error: 'La imagen supera los 5 MB.',
      }
    }

    if (error instanceof Error && error.message.includes('is not a case')) {
      return {
        ok: false,
        error: 'Este contenido no es de tipo Case.',
      }
    }

    return {
      ok: false,
      error: 'No se ha podido añadir la imagen.',
    }
  }
}

export async function addCaseCarouselVideoAction(
  input: unknown,
): Promise<CaseCarouselActionResult> {
  const result = addCaseCarouselVideoSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del vídeo no son válidos.',
    }
  }

  try {
    const verified = await verifyCloudinaryVideoAsset(
      result.data.cloudinaryPublicId,
      result.data.durationSeconds,
    )

    const mediaId = await addCaseCarouselVideo({
      ...result.data,
      ...verified,
    })

    await warmContentAfterResponse(result.data.contentId)

    revalidateContent(result.data.contentId)

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    if (error instanceof CloudinaryVideoVerificationError) {
      return {
        ok: false,
        error: error.message,
      }
    }

    if (error instanceof Error && error.message.includes('Video is too long')) {
      return {
        ok: false,
        error: 'El vídeo supera los 180 segundos.',
      }
    }

    if (
      error instanceof Error &&
      error.message.includes('Video is too large')
    ) {
      return {
        ok: false,
        error: 'El vídeo supera los 100 MB.',
      }
    }

    if (error instanceof Error && error.message.includes('is not a case')) {
      return {
        ok: false,
        error: 'Este contenido no es de tipo Case.',
      }
    }

    return {
      ok: false,
      error: 'No se ha podido añadir el vídeo.',
    }
  }
}

export async function removeCaseCarouselMediaAction(
  input: unknown,
): Promise<RemoveCaseCarouselMediaActionResult> {
  const result = removeCaseCarouselMediaSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del medio no son válidos.',
    }
  }

  // El archivo de Cloudinary se identifica LEYENDO la base de datos antes de
  // desvincular (como hacen los pines): no se fía del public id que manda el
  // navegador.
  const mediaRefs = (await snapshotContentMedia(result.data.contentId)).filter(
    (ref) => ref.mediaId === result.data.mediaId,
  )

  try {
    await removeCaseCarouselMedia(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('no pertenece a este caso')
    ) {
      return {
        ok: false,
        error: error.message,
      }
    }

    if (
      error instanceof Error &&
      (error.message.includes('foreign key') ||
        ('code' in error && error.code === '23503'))
    ) {
      return {
        ok: false,
        error: 'Este medio se sigue usando en otro sitio y no se puede borrar.',
      }
    }

    return {
      ok: false,
      error: 'No se ha podido quitar el medio.',
    }
  }

  // Postgres ya borró el `media_asset` (remove_case_carousel_media); aquí se
  // borra el archivo real en Cloudinary, solo si ya nadie lo referencia.
  // Best-effort: si falla, el medio ya está desvinculado y solo se avisa.
  const purge = await purgeRemovedMedia(mediaRefs)

  revalidateContent(result.data.contentId)

  if (purge.failed > 0) {
    return {
      ok: true,
      warning:
        'Se ha desvinculado el medio, pero el archivo no se ha podido borrar de Cloudinary. Se limpiará con el reconciliador (scripts/reconcile-cloudinary.mjs).',
    }
  }

  return {
    ok: true,
  }
}

/**
 * Quita TODAS las diapositivas del carrusel de un case. La lista se lee en
 * servidor (no se fía de lo que mande el navegador) y cada medio se
 * desvincula con `remove_case_carousel_media`, igual que al quitarlos de
 * uno en uno; los archivos de Cloudinary se borran después, solo los de los
 * medios ya desvinculados.
 *
 * No es atómico entre medios: si uno falla, se detiene e informa de cuántos
 * se quitaron (los ya quitados no se restauran).
 */
export async function removeAllCaseCarouselMediaAction(
  contentId: string,
): Promise<RemoveCaseCarouselMediaActionResult> {
  const parsedContentId = z.string().uuid().safeParse(contentId)

  if (!parsedContentId.success) {
    return {
      ok: false,
      error: 'El identificador del contenido no es válido.',
    }
  }

  let items: Awaited<ReturnType<typeof getCaseCarousel>>

  try {
    items = await getCaseCarousel(parsedContentId.data)
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      error: 'No se ha podido leer el carrusel del caso.',
    }
  }

  if (items.length === 0) {
    return {
      ok: false,
      error: 'Este caso no tiene diapositivas que quitar.',
    }
  }

  const removed: typeof items = []

  let failed = false

  for (const item of items) {
    try {
      await removeCaseCarouselMedia({
        contentId: parsedContentId.data,
        mediaId: item.mediaId,
        cloudinaryPublicId: item.cloudinaryPublicId,
        kind: item.kind,
      })
    } catch (error) {
      console.error(error)
      failed = true
      break
    }

    removed.push(item)
  }

  // Aunque haya fallado a mitad, las diapositivas ya quitadas dejan su
  // archivo sin dueño: se borra igualmente (solo si Postgres ya no lo tiene).
  const purge = await purgeRemovedMedia(
    removed.map((item) => ({
      mediaId: item.mediaId,
      cloudinaryPublicId: item.cloudinaryPublicId,
      kind: item.kind,
    })),
  )

  const cloudinaryFailures = purge.failed

  revalidateContent(parsedContentId.data)

  if (failed) {
    return {
      ok: false,
      error: `Se han quitado ${removed.length} de ${items.length} diapositivas; el borrado se ha detenido por un error. Recarga la página y vuelve a intentarlo.`,
    }
  }

  if (cloudinaryFailures > 0) {
    return {
      ok: true,
      warning: `Se han desvinculado las ${removed.length} diapositivas, pero ${cloudinaryFailures} archivo(s) no se han podido borrar de Cloudinary. Se limpiarán con el reconciliador (scripts/reconcile-cloudinary.mjs).`,
    }
  }

  return {
    ok: true,
  }
}

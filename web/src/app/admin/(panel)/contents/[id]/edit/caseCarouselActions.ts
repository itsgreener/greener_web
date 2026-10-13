'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'
import {
  addCaseCarouselImage,
  addCaseCarouselVideo,
  removeAllCaseCarouselMedia,
  removeCaseCarouselMedia,
} from '@/modules/content/container'
import {
  addCaseCarouselImageSchema,
  addCaseCarouselVideoSchema,
  removeCaseCarouselMediaSchema,
} from '@/modules/media/domain/mediaAssetSchema'
import {
  ImageVerificationError,
  VideoVerificationError,
} from '@/modules/media/domain/mediaVerification'

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
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = addCaseCarouselImageSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos de la imagen no son válidos.',
    }
  }

  try {
    const mediaId = await addCaseCarouselImage(result.data)

    revalidateContent(result.data.contentId)

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    if (error instanceof ImageVerificationError) {
      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: adminErrorMessage(error, 'No se ha podido añadir la imagen.', [
        'image_too_large',
        'not_a_case',
      ]),
    }
  }
}

export async function addCaseCarouselVideoAction(
  input: unknown,
): Promise<CaseCarouselActionResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = addCaseCarouselVideoSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del vídeo no son válidos.',
    }
  }

  try {
    const mediaId = await addCaseCarouselVideo(result.data)

    revalidateContent(result.data.contentId)

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    if (error instanceof VideoVerificationError) {
      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: adminErrorMessage(error, 'No se ha podido añadir el vídeo.', [
        'video_too_long',
        'video_too_large',
        'not_a_case',
      ]),
    }
  }
}

export async function removeCaseCarouselMediaAction(
  input: unknown,
): Promise<RemoveCaseCarouselMediaActionResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = removeCaseCarouselMediaSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del medio no son válidos.',
    }
  }

  let purge: Awaited<ReturnType<typeof removeCaseCarouselMedia>>

  try {
    purge = await removeCaseCarouselMedia(result.data)
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      error: adminErrorMessage(
        error,
        'No se ha podido quitar el medio.',
        ['media_in_use'],
        { media_not_owned: 'Este medio no pertenece a este caso' },
      ),
    }
  }

  revalidateContent(result.data.contentId)

  // Postgres ya desvinculó el medio; si el archivo no se pudo borrar solo se
  // avisa: el reconciliador lo recoge.
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
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const parsedContentId = z.uuid().safeParse(contentId)

  if (!parsedContentId.success) {
    return {
      ok: false,
      error: 'El identificador del contenido no es válido.',
    }
  }

  let outcome: Awaited<ReturnType<typeof removeAllCaseCarouselMedia>>

  try {
    outcome = await removeAllCaseCarouselMedia(parsedContentId.data)
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      error: 'No se ha podido leer el carrusel del caso.',
    }
  }

  if (outcome.total === 0) {
    return {
      ok: false,
      error: 'Este caso no tiene diapositivas que quitar.',
    }
  }

  revalidateContent(parsedContentId.data)

  if (outcome.interrupted) {
    return {
      ok: false,
      error: `Se han quitado ${outcome.removed} de ${outcome.total} diapositivas; el borrado se ha detenido por un error. Recarga la página y vuelve a intentarlo.`,
    }
  }

  if (outcome.purge.failed > 0) {
    return {
      ok: true,
      warning: `Se han desvinculado las ${outcome.removed} diapositivas, pero ${outcome.purge.failed} archivo(s) no se han podido borrar de Cloudinary. Se limpiarán con el reconciliador (scripts/reconcile-cloudinary.mjs).`,
    }
  }

  return {
    ok: true,
  }
}

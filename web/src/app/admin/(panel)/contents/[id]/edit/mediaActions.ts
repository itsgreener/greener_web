'use server'

import { revalidatePath } from 'next/cache'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import {
  deleteCoverMediaSchema,
  registerCoverImageSchema,
  registerCoverVideoSchema,
} from '@/modules/media/domain/mediaAssetSchema'
import {
  ImageVerificationError,
  VideoVerificationError,
} from '@/modules/media/domain/mediaVerification'
import {
  deleteCoverMedia,
  registerCoverImage,
  registerCoverVideo,
} from '@/modules/media/container'

export type RegisterMediaActionResult =
  | {
      ok: true
      mediaId: string
    }
  | {
      ok: false
      error: string
    }

export type DeleteMediaActionResult =
  | {
      ok: true
      // Se ha borrado en Postgres pero Cloudinary no ha confirmado el
      // borrado del archivo real — no bloqueante (el ABM puede seguir con
      // la subida), pero se avisa porque es justo lo que se quiere evitar.
      warning?: string
    }
  | {
      ok: false
      error: string
    }

export async function registerCoverImageAction(
  input: unknown,
): Promise<RegisterMediaActionResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = registerCoverImageSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos de la imagen no son válidos.',
    }
  }

  try {
    const mediaId = await registerCoverImage(result.data)

    revalidatePath(`/admin/contents/${result.data.contentId}/edit`)

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
      error: adminErrorMessage(error, 'No se ha podido registrar la imagen.', [
        'image_too_large',
        'cover_unsupported',
      ]),
    }
  }
}

export async function registerCoverVideoAction(
  input: unknown,
): Promise<RegisterMediaActionResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = registerCoverVideoSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del vídeo no son válidos.',
    }
  }

  try {
    const mediaId = await registerCoverVideo(result.data)

    revalidatePath(`/admin/contents/${result.data.contentId}/edit`)

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
      error: adminErrorMessage(error, 'No se ha podido registrar el vídeo.', [
        'cover_video_unsupported',
        'video_too_long',
        'video_too_large',
      ]),
    }
  }
}

/**
 * Desvincula y borra la portada actual de un contenido ANTES de subir la
 * que la sustituye (ver el caso de uso `deleteCoverMedia`).
 *
 * Si falla el paso de Postgres (p.ej. el medio ya no coincide con el
 * contenido, o sigue referenciado en otro lugar), se devuelve error y el
 * ABM no debe continuar con la subida del nuevo archivo. Si Postgres
 * tiene éxito pero Cloudinary falla, se devuelve ok con un warning: no
 * bloquea al admin y el reconciliador recoge el archivo suelto.
 */
export async function deleteCoverMediaAction(
  input: unknown,
): Promise<DeleteMediaActionResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = deleteCoverMediaSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos de la portada a sustituir no son válidos.',
    }
  }

  let purge: Awaited<ReturnType<typeof deleteCoverMedia>>

  try {
    purge = await deleteCoverMedia(result.data)
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      error: adminErrorMessage(
        error,
        'No se ha podido desvincular la portada anterior.',
        ['stale_reference', 'media_in_use'],
      ),
    }
  }

  if (purge.failed > 0) {
    return {
      ok: true,
      warning:
        'Se ha desvinculado la portada anterior, pero no se ha podido borrar el archivo en Cloudinary. Se limpiará con el reconciliador (scripts/reconcile-cloudinary.mjs).',
    }
  }

  return {
    ok: true,
  }
}

'use server'

import { revalidatePath } from 'next/cache'

import {
  deleteCoverMediaSchema,
  registerCoverImageSchema,
  registerCoverVideoSchema,
} from '@/modules/media/domain/mediaAssetSchema'

import { registerCoverImage } from '@/modules/media/application/registerCoverImage'

import { registerCoverVideo } from '@/modules/media/application/registerCoverVideo'

import { deleteCoverMedia } from '@/modules/media/application/deleteCoverMedia'

import {
  CloudinaryImageVerificationError,
  deleteCloudinaryAsset,
  verifyCloudinaryImageAsset,
} from '@/modules/media/infrastructure/cloudinaryServer'

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
  const result = registerCoverImageSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos de la imagen no son válidos.',
    }
  }

  try {
    const verified =
      await verifyCloudinaryImageAsset(
        result.data.cloudinaryPublicId,
      )

    const mediaId = await registerCoverImage({
      ...result.data,
      ...verified,
    })

    revalidatePath(
      `/admin/contents/${result.data.contentId}/edit`,
    )

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    if (
      error instanceof
      CloudinaryImageVerificationError
    ) {
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

    if (
      error instanceof Error &&
      error.message.includes(
        'does not support a cover image',
      )
    ) {
      return {
        ok: false,
        error:
          'Este tipo de contenido no admite imagen de portada.',
      }
    }

    return {
      ok: false,
      error: 'No se ha podido registrar la imagen.',
    }
  }
}

export async function registerCoverVideoAction(
  input: unknown,
): Promise<RegisterMediaActionResult> {
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

    if (
      error instanceof Error &&
      error.message.includes('Only free-form content supports a cover video')
    ) {
      return {
        ok: false,
        error: 'Solo el contenido libre (Other) admite vídeo de portada.',
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

    return {
      ok: false,
      error: 'No se ha podido registrar el vídeo.',
    }
  }
}

/**
 * Desvincula y borra la portada actual de un contenido ANTES de subir la
 * que la sustituye: primero Postgres (unlink_and_delete_cover_media —
 * atómico, y si el medio sigue en uso en otro sitio, aborta sin tocar
 * nada más), y solo si eso tiene éxito se borra el archivo real en
 * Cloudinary.
 *
 * Si falla el paso de Postgres (p.ej. el medio ya no coincide con el
 * contenido, o sigue referenciado en otro lugar), se devuelve error y el
 * ABM no debe continuar con la subida del nuevo archivo. Si Postgres
 * tiene éxito pero Cloudinary falla, se devuelve ok con un warning: no
 * bloquea al admin, pero dice claramente que ha quedado un archivo suelto
 * en Cloudinary que alguien tendrá que borrar a mano.
 */
export async function deleteCoverMediaAction(
  input: unknown,
): Promise<DeleteMediaActionResult> {
  const result = deleteCoverMediaSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos de la portada a sustituir no son válidos.',
    }
  }

  try {
    await deleteCoverMedia(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('ya no apunta a este medio')
    ) {
      return {
        ok: false,
        error:
          'Este medio ha cambiado desde otra pestaña o sesión. Recarga la página antes de sustituirlo.',
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
      error: 'No se ha podido desvincular la portada anterior.',
    }
  }

  try {
    await deleteCloudinaryAsset(
      result.data.cloudinaryPublicId,
      result.data.kind,
    )
  } catch (error) {
    console.error(error)

    return {
      ok: true,
      warning:
        'Se ha desvinculado la portada anterior, pero no se ha podido borrar el archivo en Cloudinary. Revísalo manualmente si el consumo del plan gratuito te preocupa.',
    }
  }

  return {
    ok: true,
  }
}

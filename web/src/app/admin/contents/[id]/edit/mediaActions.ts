'use server'

import { revalidatePath } from 'next/cache'

import {
  deleteBlockMediaSchema,
  registerImageForBlockSchema,
  registerVideoForBlockSchema,
} from '@/modules/media/domain/mediaAssetSchema'

import { registerImageForBlock } from '@/modules/media/application/registerImageForBlock'

import { registerVideoForBlock } from '@/modules/media/application/registerVideoForBlock'

import { deleteBlockMedia } from '@/modules/media/application/deleteBlockMedia'

import { deleteCloudinaryAsset } from '@/modules/media/infrastructure/cloudinaryServer'

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

export async function registerImageForBlockAction(
  input: unknown,
): Promise<RegisterMediaActionResult> {
  const result = registerImageForBlockSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos de la imagen no son válidos.',
    }
  }

  try {
    const mediaId = await registerImageForBlock(result.data)

    revalidatePath(`/admin/contents/${result.data.contentId}/edit`)

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('Image is too large')
    ) {
      return {
        ok: false,
        error: 'La imagen supera los 5 MB.',
      }
    }

    return {
      ok: false,
      error: 'No se ha podido registrar la imagen.',
    }
  }
}

export async function registerVideoForBlockAction(
  input: unknown,
): Promise<RegisterMediaActionResult> {
  const result = registerVideoForBlockSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del vídeo no son válidos.',
    }
  }

  try {
    const mediaId = await registerVideoForBlock(result.data)

    revalidatePath(`/admin/contents/${result.data.contentId}/edit`)

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('Block is not a video block')
    ) {
      return {
        ok: false,
        error: 'Este bloque no es de tipo Video.',
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
 * Desvincula y borra el medio actual de un bloque ANTES de subir el que lo
 * sustituye: primero Postgres (unlink_and_delete_media_asset — atómico, y
 * si el medio sigue en uso en otro sitio, aborta sin tocar nada más), y
 * solo si eso tiene éxito se borra el archivo real en Cloudinary.
 *
 * Si falla el paso de Postgres (p.ej. el medio ya no coincide con el
 * bloque, o sigue referenciado en otro lugar), se devuelve error y el
 * ABM no debe continuar con la subida del nuevo archivo. Si Postgres
 * tiene éxito pero Cloudinary falla, se devuelve ok con un warning: no
 * bloquea al admin, pero dice claramente que ha quedado un archivo suelto
 * en Cloudinary que alguien tendrá que borrar a mano.
 */
export async function deleteBlockMediaAction(
  input: unknown,
): Promise<DeleteMediaActionResult> {
  const result = deleteBlockMediaSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del medio a sustituir no son válidos.',
    }
  }

  try {
    await deleteBlockMedia(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('El bloque ya no apunta a este medio')
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
      error: 'No se ha podido desvincular el medio anterior.',
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
        'Se ha desvinculado el medio anterior, pero no se ha podido borrar el archivo en Cloudinary. Revísalo manualmente si el consumo del plan gratuito te preocupa.',
    }
  }

  return {
    ok: true,
  }
}

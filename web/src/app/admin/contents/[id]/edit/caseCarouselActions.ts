'use server'

import { revalidatePath } from 'next/cache'

import {
  addCaseCarouselImageSchema,
  addCaseCarouselVideoSchema,
  removeCaseCarouselMediaSchema,
} from '@/modules/media/domain/mediaAssetSchema'

import { addCaseCarouselImage } from '@/modules/media/application/addCaseCarouselImage'
import { addCaseCarouselVideo } from '@/modules/media/application/addCaseCarouselVideo'
import { removeCaseCarouselMedia } from '@/modules/media/application/removeCaseCarouselMedia'

import {
  CloudinaryImageVerificationError,
  deleteCloudinaryAsset,
  verifyCloudinaryImageAsset,
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
  const result =
    addCaseCarouselImageSchema.safeParse(input)

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

    const mediaId =
      await addCaseCarouselImage({
        ...result.data,
        ...verified,
      })

    revalidateContent(
      result.data.contentId,
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
      error.message.includes('is not a case')
    ) {
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
    return { ok: false, error: 'Los datos del vídeo no son válidos.' }
  }

  try {
    const mediaId = await addCaseCarouselVideo(result.data)

    revalidateContent(result.data.contentId)

    return { ok: true, mediaId }
  } catch (error) {
    console.error(error)

    if (error instanceof Error && error.message.includes('Video is too long')) {
      return { ok: false, error: 'El vídeo supera los 180 segundos.' }
    }

    if (
      error instanceof Error &&
      error.message.includes('Video is too large')
    ) {
      return { ok: false, error: 'El vídeo supera los 100 MB.' }
    }

    if (error instanceof Error && error.message.includes('is not a case')) {
      return { ok: false, error: 'Este contenido no es de tipo Case.' }
    }

    return { ok: false, error: 'No se ha podido añadir el vídeo.' }
  }
}

export async function removeCaseCarouselMediaAction(
  input: unknown,
): Promise<RemoveCaseCarouselMediaActionResult> {
  const result = removeCaseCarouselMediaSchema.safeParse(input)

  if (!result.success) {
    return { ok: false, error: 'Los datos del medio no son válidos.' }
  }

  try {
    await removeCaseCarouselMedia(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('no pertenece a este caso')
    ) {
      return { ok: false, error: error.message }
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

    return { ok: false, error: 'No se ha podido quitar el medio.' }
  }

  revalidateContent(result.data.contentId)

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
        'Se ha desvinculado el medio, pero no se ha podido borrar el archivo en Cloudinary. Revísalo manualmente si el consumo del plan gratuito te preocupa.',
    }
  }

  return { ok: true }
}

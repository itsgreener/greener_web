'use server'

import {
  revalidatePath,
} from 'next/cache'

import {
  registerImageForBlockSchema,
  registerVideoForBlockSchema,
} from '@/modules/media/domain/mediaAssetSchema'

import {
  registerImageForBlock,
} from '@/modules/media/application/registerImageForBlock'

import {
  registerVideoForBlock,
} from '@/modules/media/application/registerVideoForBlock'

export type RegisterMediaActionResult =
  | {
      ok: true
      mediaId: string
    }
  | {
      ok: false
      error: string
    }

export async function registerImageForBlockAction(
  input: unknown
): Promise<RegisterMediaActionResult> {

  const result =
    registerImageForBlockSchema
      .safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error:
        'Los datos de la imagen no son válidos.',
    }
  }

  try {
    const mediaId =
      await registerImageForBlock(
        result.data
      )

    revalidatePath(
      `/admin/contents/${result.data.contentId}/edit`
    )

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      error:
        'No se ha podido registrar la imagen.',
    }
  }
}

export async function registerVideoForBlockAction(
  input: unknown
): Promise<RegisterMediaActionResult> {

  const result =
    registerVideoForBlockSchema
      .safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error:
        'Los datos del vídeo no son válidos.',
    }
  }

  try {
    const mediaId =
      await registerVideoForBlock(
        result.data
      )

    revalidatePath(
      `/admin/contents/${result.data.contentId}/edit`
    )

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes(
        'Block is not a video block'
      )
    ) {
      return {
        ok: false,
        error:
          'Este bloque no es de tipo Video.',
      }
    }

    if (
      error instanceof Error &&
      error.message.includes(
        'Video is too long'
      )
    ) {
      return {
        ok: false,
        error:
          'El vídeo supera los 180 segundos.',
      }
    }

    if (
      error instanceof Error &&
      error.message.includes(
        'Video is too large'
      )
    ) {
      return {
        ok: false,
        error:
          'El vídeo supera los 100 MB.',
      }
    }

    return {
      ok: false,
      error:
        'No se ha podido registrar el vídeo.',
    }
  }
}
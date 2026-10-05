'use server'

import { revalidatePath } from 'next/cache'

import {
  createPinSchema,
  updatePinSchema,
  deletePinSchema,
  type CreatePinInput,
} from '@/modules/pin/domain/pinSchema'

import { createPin } from '@/modules/pin/application/createPin'
import { updatePin } from '@/modules/pin/application/updatePin'
import { deletePin } from '@/modules/pin/application/deletePin'

import {
  attachPinImageSchema,
  attachPinVideoSchema,
  detachPinMediaSchema,
} from '@/modules/pin/domain/pinMediaSchema'

import { attachPinImage } from '@/modules/pin/application/attachPinImage'
import { attachPinVideo } from '@/modules/pin/application/attachPinVideo'
import { detachPinMedia } from '@/modules/pin/application/detachPinMedia'

import {
  CloudinaryImageVerificationError,
  CloudinaryVideoVerificationError,
  deleteCloudinaryAsset,
  verifyCloudinaryImageAsset,
  verifyCloudinaryVideoAsset,
} from '@/modules/media/infrastructure/cloudinaryServer'

import {
  PIN_ANIMATION_LIMITS,
  TOOL_PIN_VIDEO_LIMITS,
  VIDEO_LIMITS,
} from '@/modules/media/domain/mediaLimits'

import {
  purgeRemovedMedia,
  snapshotPinMedia,
} from '@/modules/media/application/cleanupMedia'

export type PinFormState = {
  fieldErrors?: Record<string, string[]>
  formError?: string
  success?: boolean
  // El pin se borró bien, pero algún archivo no se pudo borrar de Cloudinary.
  warning?: string
}

export type PinMediaActionResult =
  | {
      ok: true
      mediaId: string
    }
  | {
      ok: false
      error: string
    }

export type DetachPinMediaActionResult =
  | {
      ok: true
      warning?: string
    }
  | {
      ok: false
      error: string
    }

function revalidateContent(contentId: string) {
  revalidatePath(`/admin/contents/${contentId}/edit`)
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (value === null || value === '') {
    return null
  }

  return Number(value)
}

export async function createPinAction(
  contentId: string,
  _previousState: PinFormState,
  formData: FormData,
): Promise<PinFormState> {
  const result = createPinSchema.safeParse({
    contentId,
    ratio: formData.get('ratio'),
    showAsCarousel: formData.get('showAsCarousel') === 'true',
    label: formData.get('label'),
    language: formData.get('language'),
    autoplayMode: formData.get('autoplayMode') || null,
    speedMs: parseOptionalNumber(formData.get('speedMs')),
    queueOrder: formData.get('queueOrder') || 0,
    alt: formData.get('alt'),
  })

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
    }
  }

  try {
    await createPin(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('rótulo del pin es obligatorio')
    ) {
      return {
        fieldErrors: {
          label: [error.message],
        },
      }
    }

    return {
      formError: 'No se ha podido crear el pin.',
    }
  }

  revalidateContent(contentId)

  return {
    success: true,
  }
}

export async function updatePinAction(
  pinId: string,
  contentId: string,
  _previousState: PinFormState,
  formData: FormData,
): Promise<PinFormState> {
  const result = updatePinSchema.safeParse({
    id: pinId,
    ratio: formData.get('ratio'),
    showAsCarousel: formData.get('showAsCarousel') === 'true',
    label: formData.get('label'),
    language: formData.get('language'),
    autoplayMode: formData.get('autoplayMode') || null,
    speedMs: parseOptionalNumber(formData.get('speedMs')),
    queueOrder: formData.get('queueOrder') || 0,
    alt: formData.get('alt'),
  })

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
    }
  }

  try {
    await updatePin(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('rótulo del pin es obligatorio')
    ) {
      return {
        fieldErrors: {
          label: [error.message],
        },
      }
    }

    return {
      formError: 'No se ha podido actualizar el pin.',
    }
  }

  revalidateContent(contentId)

  return {
    success: true,
  }
}

export async function deletePinAction(
  pinId: string,
  contentId: string,
): Promise<PinFormState> {
  const result = deletePinSchema.safeParse({
    id: pinId,
  })

  if (!result.success) {
    return {
      formError: 'El identificador del pin no es válido.',
    }
  }

  // Los medios del pin se leen ANTES de borrarlo: después ya no hay forma
  // de saber qué archivos de Cloudinary eran suyos.
  const mediaRefs = await snapshotPinMedia(result.data.id)

  try {
    await deletePin(result.data)
  } catch (error) {
    console.error(error)

    return {
      formError: 'No se ha podido borrar el pin.',
    }
  }

  // Postgres ya borró los media_asset que quedaron sin referencias
  // (delete_pin); aquí se borra el archivo real en Cloudinary. Best-effort:
  // si falla, el pin ya no existe y solo se avisa.
  const purge = await purgeRemovedMedia(mediaRefs)

  revalidateContent(contentId)

  if (purge.failed > 0) {
    return {
      success: true,
      warning: `Se ha borrado el pin, pero ${purge.failed} archivo(s) no se han podido borrar de Cloudinary. Se limpiarán con el reconciliador (scripts/reconcile-cloudinary.mjs). Recarga la página.`,
    }
  }

  return {
    success: true,
  }
}

/**
 * Crea el pin y adjunta la imagen en una sola llamada.
 *
 * El archivo ya ha sido subido previamente a Cloudinary
 * desde el cliente, pero NO se confía en los metadatos
 * enviados por el navegador.
 *
 * Antes de registrar la imagen en Postgres se consulta el
 * asset real en Cloudinary y se valida en servidor.
 */
export type CreatePinWithImageInput = CreatePinInput & {
  cloudinaryPublicId: string
  format?: string
  width: number
  height: number
  bytes: number
}

export type CreatePinWithImageResult =
  | {
      ok: true
      pinId: string
      mediaId: string
    }
  | {
      ok: false
      pinId?: string
      error: string
    }

export async function createPinWithImageAction(
  input: unknown,
): Promise<CreatePinWithImageResult> {
  const pinResult = createPinSchema.safeParse(input)

  if (!pinResult.success) {
    const firstIssue = pinResult.error.issues[0]?.message

    return {
      ok: false,
      error: firstIssue ?? 'Los datos del pin no son válidos.',
    }
  }

  let pinId: string

  try {
    pinId = await createPin(pinResult.data)
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      error: 'No se ha podido crear el pin.',
    }
  }

  const imageInput = input as Partial<CreatePinWithImageInput>

  if (typeof imageInput.cloudinaryPublicId !== 'string') {
    return {
      ok: false,
      pinId,
      error: 'El pin se creó, pero la imagen no es válida.',
    }
  }

  let verifiedImage

  try {
    verifiedImage = await verifyCloudinaryImageAsset(
      imageInput.cloudinaryPublicId,
    )
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      pinId,
      error:
        error instanceof CloudinaryImageVerificationError
          ? error.message
          : 'El pin se creó, pero no se ha podido verificar la imagen.',
    }
  }

  const imageResult = attachPinImageSchema.safeParse({
    pinId,
    ...verifiedImage,
    slideOrder: 0,
  })

  if (!imageResult.success) {
    return {
      ok: false,
      pinId,
      error: imageResult.error.issues[0]?.message ?? 'La imagen no es válida.',
    }
  }

  try {
    const mediaId = await attachPinImage(imageResult.data)

    revalidateContent(pinResult.data.contentId)

    return {
      ok: true,
      pinId,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    revalidateContent(pinResult.data.contentId)

    return {
      ok: false,
      pinId,
      error:
        error instanceof Error
          ? error.message
          : 'El pin se creó pero no se ha podido adjuntar la imagen.',
    }
  }
}

export async function attachPinImageAction(
  input: unknown,
): Promise<PinMediaActionResult> {
  const result = attachPinImageSchema.safeParse(input)

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

    const mediaId = await attachPinImage({
      ...result.data,
      ...verified,
    })

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

    if (
      error instanceof Error &&
      error.message.includes('admite hasta 8 medios')
    ) {
      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: 'No se ha podido adjuntar la imagen.',
    }
  }
}

export async function attachPinVideoAction(
  input: unknown,
): Promise<PinMediaActionResult> {
  const result = attachPinVideoSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del vídeo no son válidos.',
    }
  }

  try {
    const verified = await verifyCloudinaryVideoAsset(
      result.data.cloudinaryPublicId,
    )

    const { durationAssumed, ...verifiedAsset } = verified

    const mediaId = await attachPinVideo({
      ...result.data,
      ...verifiedAsset,
      // Si la Admin API no devolvió duración (parche temporal `?? 10` de
      // verifyCloudinaryVideoAsset), `verifiedAsset.durationSeconds` es un
      // 10 inventado: usarlo haría que TODO vídeo de pin pasara por «más
      // de 8 s» y se quedara en poster en el feed. En ese caso se usa la
      // duración que Cloudinary dio al navegador en la respuesta de la
      // propia subida (ya validada por el esquema), que es real.
      durationSeconds: durationAssumed
        ? result.data.durationSeconds
        : verifiedAsset.durationSeconds,
    })

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

    if (
      error instanceof Error &&
      error.message.includes('Animation is too long')
    ) {
      return {
        ok: false,
        error: `El vídeo supera la duración máxima de un pin (${PIN_ANIMATION_LIMITS.maxDurationSeconds} s; ${TOOL_PIN_VIDEO_LIMITS.maxDurationSeconds} s en las tools).`,
      }
    }

    if (
      error instanceof Error &&
      error.message.includes('Video is too large')
    ) {
      return {
        ok: false,
        error: `El vídeo supera el peso máximo de un pin (${VIDEO_LIMITS.maxSizeBytes / 1024 / 1024} MB; ${TOOL_PIN_VIDEO_LIMITS.maxSizeBytes / 1024 / 1024} MB en las tools).`,
      }
    }

    if (
      error instanceof Error &&
      error.message.includes('admite hasta 8 medios')
    ) {
      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: 'No se ha podido adjuntar el vídeo.',
    }
  }
}

/**
 * Primero se desvincula el medio en Postgres.
 *
 * Solo después se intenta borrar el archivo real de
 * Cloudinary. Si el borrado físico falla, no se revierte
 * la operación de Postgres: se devuelve un warning.
 */
export async function detachPinMediaAction(
  input: unknown,
): Promise<DetachPinMediaActionResult> {
  const result = detachPinMediaSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del medio no son válidos.',
    }
  }

  try {
    await detachPinMedia(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('no pertenece a este pin')
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

  return {
    ok: true,
  }
}

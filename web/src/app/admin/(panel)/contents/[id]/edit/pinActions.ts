'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { invalidateFeedCache } from '@/lib/cache/feedCache'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'
import { fieldErrorsOf } from '@/lib/forms/formActionState'

import {
  ImageVerificationError,
  VideoVerificationError,
} from '@/modules/media/domain/mediaVerification'
import {
  PIN_ANIMATION_LIMITS,
  TOOL_PIN_VIDEO_LIMITS,
  VIDEO_LIMITS,
} from '@/modules/media/domain/mediaLimits'
import { CreatePinWithMediaError } from '@/modules/pin/domain/createPinWithMediaError'
import { PIN_LABEL_REQUIRED_MESSAGE } from '@/modules/pin/domain/pinMessages'
import {
  attachPinImageSchema,
  attachPinVideoSchema,
  detachPinMediaSchema,
  pinVideoUploadSchema,
} from '@/modules/pin/domain/pinMediaSchema'
import {
  createPinSchema,
  deletePinSchema,
  updatePinSchema,
  type CreatePinInput,
} from '@/modules/pin/domain/pinSchema'
import { pinCreationErrorMessage } from '@/modules/pin/domain/pinCreationError'
import {
  attachPinImage,
  attachPinVideo,
  createPin,
  createPinWithImage,
  createPinWithVideo,
  deleteAllPins,
  deletePin,
  detachPinMedia,
  updatePin,
} from '@/modules/pin/container'
import { isDomainError } from '@/modules/shared/domain/domainError'

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
  invalidateFeedCache()
}

const PURGE_WARNING =
  'Se limpiarán con el reconciliador (scripts/reconcile-cloudinary.mjs). Recarga la página.'

export async function createPinAction(
  contentId: string,
  _previousState: PinFormState,
  formData: FormData,
): Promise<PinFormState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = createPinSchema.safeParse({
    contentId,
    ratio: formData.get('ratio'),
    label: formData.get('label'),
    language: formData.get('language'),
    autoplayMode: formData.get('autoplayMode') || null,
    alt: formData.get('alt'),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await createPin(result.data)
  } catch (error) {
    console.error(error)

    if (isDomainError(error, 'pin_label_required')) {
      return {
        fieldErrors: {
          label: [PIN_LABEL_REQUIRED_MESSAGE],
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
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = updatePinSchema.safeParse({
    id: pinId,
    ratio: formData.get('ratio'),
    label: formData.get('label'),
    language: formData.get('language'),
    autoplayMode: formData.get('autoplayMode') || null,
    alt: formData.get('alt'),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await updatePin(result.data)
  } catch (error) {
    console.error(error)

    if (isDomainError(error, 'pin_label_required')) {
      return {
        fieldErrors: {
          label: [PIN_LABEL_REQUIRED_MESSAGE],
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
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = deletePinSchema.safeParse({
    id: pinId,
  })

  if (!result.success) {
    return {
      formError: 'El identificador del pin no es válido.',
    }
  }

  let purge: Awaited<ReturnType<typeof deletePin>>

  try {
    purge = await deletePin(result.data)
  } catch (error) {
    console.error(error)

    return {
      formError: 'No se ha podido borrar el pin.',
    }
  }

  revalidateContent(contentId)

  if (purge.failed > 0) {
    return {
      success: true,
      warning: `Se ha borrado el pin, pero ${purge.failed} archivo(s) no se han podido borrar de Cloudinary. ${PURGE_WARNING}`,
    }
  }

  return {
    success: true,
  }
}

/**
 * Borra TODOS los pines de un contenido (máximo 8). No es atómico entre
 * pines: si uno falla, se detiene y se informa de cuántos se llegaron a
 * borrar (los ya borrados no se restauran, y su Cloudinary se limpia
 * igualmente).
 */
export async function deleteAllPinsAction(
  contentId: string,
): Promise<PinFormState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const parsedContentId = z.uuid().safeParse(contentId)

  if (!parsedContentId.success) {
    return {
      formError: 'El identificador del contenido no es válido.',
    }
  }

  let outcome: Awaited<ReturnType<typeof deleteAllPins>>

  try {
    outcome = await deleteAllPins(parsedContentId.data)
  } catch (error) {
    console.error(error)

    return {
      formError: 'No se han podido leer los pines del contenido.',
    }
  }

  if (outcome.total === 0) {
    return {
      formError: 'Este contenido no tiene pines que borrar.',
    }
  }

  revalidateContent(parsedContentId.data)

  if (outcome.stopped) {
    return {
      formError: `Se han borrado ${outcome.deleted} de ${outcome.total} pines; el borrado se ha detenido por un error. Recarga la página y vuelve a intentarlo.`,
    }
  }

  if (outcome.purge.failed > 0) {
    return {
      success: true,
      warning: `Se han borrado los ${outcome.deleted} pines, pero ${outcome.purge.failed} archivo(s) no se han podido borrar de Cloudinary. ${PURGE_WARNING}`,
    }
  }

  return {
    success: true,
  }
}

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

/**
 * Crea el pin y adjunta la imagen en una sola llamada (carga masiva). El
 * orden y las garantías (verificar antes de crear, borrar el pin si el
 * adjuntado falla) están en el caso de uso `createPinWithImage`.
 */
export async function createPinWithImageAction(
  input: unknown,
): Promise<CreatePinWithImageResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const pinResult = createPinSchema.safeParse(input)

  if (!pinResult.success) {
    const firstIssue = pinResult.error.issues[0]?.message

    return {
      ok: false,
      error: firstIssue ?? 'Los datos del pin no son válidos.',
    }
  }

  const imageInput = input as Partial<CreatePinWithImageInput>

  if (typeof imageInput.cloudinaryPublicId !== 'string') {
    return {
      ok: false,
      error: 'La imagen no es válida.',
    }
  }

  try {
    const created = await createPinWithImage({
      pin: pinResult.data,
      cloudinaryPublicId: imageInput.cloudinaryPublicId,
    })

    revalidateContent(pinResult.data.contentId)

    return { ok: true, ...created }
  } catch (error) {
    console.error(error)

    if (error instanceof CreatePinWithMediaError && error.stage === 'attach') {
      revalidateContent(pinResult.data.contentId)
    }

    return { ok: false, error: createPinWithImageErrorMessage(error) }
  }
}

function createPinWithImageErrorMessage(error: unknown): string {
  if (!(error instanceof CreatePinWithMediaError)) {
    return 'No se ha podido adjuntar la imagen.'
  }

  switch (error.stage) {
    case 'verify':
      return error.cause instanceof ImageVerificationError
        ? error.cause.message
        : 'No se ha podido verificar la imagen.'

    case 'invalid_media':
      return (
        (error.cause instanceof z.ZodError
          ? error.cause.issues[0]?.message
          : undefined) ?? 'La imagen no es válida.'
      )

    case 'create_pin':
      return pinCreationErrorMessage(error.cause)

    case 'attach':
      return adminErrorMessage(
        error.cause,
        'No se ha podido adjuntar la imagen.',
        ['image_too_large', 'pin_media_limit'],
      )
  }
}

export async function attachPinImageAction(
  input: unknown,
): Promise<PinMediaActionResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = attachPinImageSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos de la imagen no son válidos.',
    }
  }

  try {
    const mediaId = await attachPinImage(result.data)

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
      error: adminErrorMessage(error, 'No se ha podido adjuntar la imagen.', [
        'image_too_large',
        'pin_media_limit',
      ]),
    }
  }
}

/**
 * Mensaje para el admin cuando adjuntar un vídeo a un pin falla. Compartido
 * por attachPinVideoAction y createPinWithVideoAction para que ambos digan
 * lo mismo.
 */
function videoAttachErrorMessage(error: unknown): string {
  if (error instanceof VideoVerificationError) {
    return error.message
  }

  return adminErrorMessage(
    error,
    'No se ha podido adjuntar el vídeo.',
    ['pin_media_limit'],
    {
      video_too_long: `El vídeo supera la duración máxima de un pin (${PIN_ANIMATION_LIMITS.maxDurationSeconds} s; ${TOOL_PIN_VIDEO_LIMITS.maxDurationSeconds} s en las tools).`,
      video_too_large: `El vídeo supera el peso máximo de un pin (${VIDEO_LIMITS.maxSizeBytes / 1024 / 1024} MB; ${TOOL_PIN_VIDEO_LIMITS.maxSizeBytes / 1024 / 1024} MB en las tools).`,
    },
  )
}

export async function attachPinVideoAction(
  input: unknown,
): Promise<PinMediaActionResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = attachPinVideoSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del vídeo no son válidos.',
    }
  }

  try {
    const mediaId = await attachPinVideo(result.data)

    return {
      ok: true,
      mediaId,
    }
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      error: videoAttachErrorMessage(error),
    }
  }
}

export type CreatePinWithVideoInput = CreatePinInput & {
  cloudinaryPublicId: string
  format?: string
  width: number
  height: number
  durationSeconds: number
  bytes: number
}

export type CreatePinWithVideoResult =
  { ok: true; pinId: string; mediaId: string } | { ok: false; error: string }

/**
 * Crea el pin y le adjunta un vídeo en una sola llamada (carga masiva de
 * pines con vídeo). Las garantías (verificar antes de crear,
 * borrar el pin si el SQL rechaza el vídeo) están en el caso de uso
 * `createPinWithVideo`.
 */
export async function createPinWithVideoAction(
  input: unknown,
): Promise<CreatePinWithVideoResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const pinResult = createPinSchema.safeParse(input)

  if (!pinResult.success) {
    return {
      ok: false,
      error:
        pinResult.error.issues[0]?.message ??
        'Los datos del pin no son válidos.',
    }
  }

  const videoInput = input as Partial<CreatePinWithVideoInput>

  const clientVideo = pinVideoUploadSchema.safeParse({
    cloudinaryPublicId: videoInput.cloudinaryPublicId,
    format: videoInput.format,
    width: videoInput.width,
    height: videoInput.height,
    durationSeconds: videoInput.durationSeconds,
    bytes: videoInput.bytes,
  })

  if (!clientVideo.success) {
    return { ok: false, error: 'Los datos del vídeo no son válidos.' }
  }

  try {
    const created = await createPinWithVideo({
      pin: pinResult.data,
      video: clientVideo.data,
    })

    revalidateContent(pinResult.data.contentId)

    return { ok: true, ...created }
  } catch (error) {
    console.error(error)

    if (!(error instanceof CreatePinWithMediaError)) {
      return { ok: false, error: videoAttachErrorMessage(error) }
    }

    if (error.stage === 'attach') {
      revalidateContent(pinResult.data.contentId)
    }

    switch (error.stage) {
      case 'verify':
        return {
          ok: false,
          error:
            error.cause instanceof VideoVerificationError
              ? error.cause.message
              : 'No se ha podido verificar el vídeo.',
        }

      case 'create_pin':
        return { ok: false, error: pinCreationErrorMessage(error.cause) }

      default:
        return { ok: false, error: videoAttachErrorMessage(error.cause) }
    }
  }
}

export async function detachPinMediaAction(
  input: unknown,
): Promise<DetachPinMediaActionResult> {
  if (!(await isAdminRequest()))
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const result = detachPinMediaSchema.safeParse(input)

  if (!result.success) {
    return {
      ok: false,
      error: 'Los datos del medio no son válidos.',
    }
  }

  let purge: Awaited<ReturnType<typeof detachPinMedia>>

  try {
    purge = await detachPinMedia(result.data)
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      error: adminErrorMessage(
        error,
        'No se ha podido quitar el medio.',
        ['media_in_use'],
        { media_not_owned: 'Este medio no pertenece a este pin' },
      ),
    }
  }

  if (purge.failed > 0) {
    return {
      ok: true,
      warning:
        'Se ha desvinculado el medio, pero no se ha podido borrar el archivo en Cloudinary. Se limpiará con el reconciliador (scripts/reconcile-cloudinary.mjs).',
    }
  }

  return {
    ok: true,
  }
}

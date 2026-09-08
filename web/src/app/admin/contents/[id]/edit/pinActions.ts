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

import { deleteCloudinaryAsset } from '@/modules/media/infrastructure/cloudinaryServer'

export type PinFormState = {
  fieldErrors?: Record<string, string[]>
  formError?: string
  success?: boolean
}

export type PinMediaActionResult =
  { ok: true; mediaId: string } | { ok: false; error: string }

export type DetachPinMediaActionResult =
  { ok: true; warning?: string } | { ok: false; error: string }

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
    type: formData.get('type'),
    ratio: formData.get('ratio'),
    label: formData.get('label'),
    cta: formData.get('cta'),
    language: formData.get('language'),
    autoplayMode: formData.get('autoplayMode') || null,
    speedMs: parseOptionalNumber(formData.get('speedMs')),
    queueOrder: formData.get('queueOrder') || 0,
    alt: formData.get('alt'),
  })

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors }
  }

  try {
    await createPin(result.data)
  } catch (error) {
    console.error(error)

    return { formError: 'No se ha podido crear el pin.' }
  }

  revalidateContent(contentId)

  return { success: true }
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
    label: formData.get('label'),
    cta: formData.get('cta'),
    language: formData.get('language'),
    autoplayMode: formData.get('autoplayMode') || null,
    speedMs: parseOptionalNumber(formData.get('speedMs')),
    queueOrder: formData.get('queueOrder') || 0,
    alt: formData.get('alt'),
  })

  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors }
  }

  try {
    await updatePin(result.data)
  } catch (error) {
    console.error(error)

    return { formError: 'No se ha podido actualizar el pin.' }
  }

  revalidateContent(contentId)

  return { success: true }
}

export async function deletePinAction(
  pinId: string,
  contentId: string,
): Promise<PinFormState> {
  const result = deletePinSchema.safeParse({ id: pinId })

  if (!result.success) {
    return { formError: 'El identificador del pin no es válido.' }
  }

  try {
    await deletePin(result.data)
  } catch (error) {
    console.error(error)

    return { formError: 'No se ha podido borrar el pin.' }
  }

  revalidateContent(contentId)

  return { success: true }
}

/**
 * Crea el pin y adjunta la imagen en una sola llamada — pensado para la
 * carga masiva (§15.4): el cliente ya subió el archivo a Cloudinary
 * (mismo flujo que el alta individual), esto solo hace las dos escrituras
 * en Postgres. Si crear el pin falla, no se intenta adjuntar nada. Si el
 * pin se crea pero adjuntar la imagen falla, el pin queda creado sin
 * medio — se informa igualmente del pinId para que el admin pueda
 * localizarlo y subirle la imagen a mano desde el listado normal, en vez
 * de perder ese pin sin más.
 */
export type CreatePinWithImageInput = CreatePinInput & {
  cloudinaryPublicId: string
  format?: string
  width: number
  height: number
  bytes: number
}

export type CreatePinWithImageResult =
  | { ok: true; pinId: string; mediaId: string }
  | { ok: false; pinId?: string; error: string }

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

    return { ok: false, error: 'No se ha podido crear el pin.' }
  }

  const imageInput = input as CreatePinWithImageInput

  const imageResult = attachPinImageSchema.safeParse({
    pinId,
    cloudinaryPublicId: imageInput.cloudinaryPublicId,
    format: imageInput.format,
    width: imageInput.width,
    height: imageInput.height,
    bytes: imageInput.bytes,
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

    return { ok: true, pinId, mediaId }
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
    return { ok: false, error: 'Los datos de la imagen no son válidos.' }
  }

  try {
    const mediaId = await attachPinImage(result.data)

    return { ok: true, mediaId }
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('Image is too large')
    ) {
      return { ok: false, error: 'La imagen supera los 5 MB.' }
    }

    if (
      error instanceof Error &&
      error.message.includes('ya tiene una imagen')
    ) {
      return { ok: false, error: error.message }
    }

    if (
      error instanceof Error &&
      error.message.includes('admite hasta 8 slides')
    ) {
      return { ok: false, error: error.message }
    }

    return { ok: false, error: 'No se ha podido adjuntar la imagen.' }
  }
}

export async function attachPinVideoAction(
  input: unknown,
): Promise<PinMediaActionResult> {
  const result = attachPinVideoSchema.safeParse(input)

  if (!result.success) {
    return { ok: false, error: 'Los datos del vídeo no son válidos.' }
  }

  try {
    const mediaId = await attachPinVideo(result.data)

    return { ok: true, mediaId }
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('Animation is too long')
    ) {
      return {
        ok: false,
        error: 'La animación no puede superar los 5 segundos.',
      }
    }

    if (
      error instanceof Error &&
      error.message.includes('Video is too large')
    ) {
      return { ok: false, error: 'El vídeo supera los 100 MB.' }
    }

    if (error instanceof Error && error.message.includes('ya tiene un vídeo')) {
      return { ok: false, error: error.message }
    }

    return { ok: false, error: 'No se ha podido adjuntar el vídeo.' }
  }
}

/**
 * Igual que deleteBlockMediaAction (mediaActions.ts): primero Postgres,
 * y solo si eso tiene éxito se borra el archivo real en Cloudinary. Si
 * Cloudinary falla, no bloquea — se avisa con un warning, mismo criterio
 * ya explicado allí (aquí se arriesga cuota de Cloudinary, no seguridad).
 */
export async function detachPinMediaAction(
  input: unknown,
): Promise<DetachPinMediaActionResult> {
  const result = detachPinMediaSchema.safeParse(input)

  if (!result.success) {
    return { ok: false, error: 'Los datos del medio no son válidos.' }
  }

  try {
    await detachPinMedia(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('no pertenece a este pin')
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

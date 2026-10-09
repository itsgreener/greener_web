'use server'

import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { revalidatePath } from 'next/cache'

import {
  publishContentSchema,
  scheduleContentSchema,
  unpublishContentSchema,
} from '@/modules/content/domain/contentSchema'

import { warmContentAfterResponse } from '@/modules/media/application/warmAfterResponse'
import { publishContent } from '@/modules/content/application/publishContent'
import { scheduleContent } from '@/modules/content/application/scheduleContent'
import { unpublishContent } from '@/modules/content/application/unpublishContent'
import { fieldErrorsOf } from '@/lib/forms/formActionState'

export type PublishActionState = {
  error?: string
  success?: boolean
}

export type ScheduleActionState = {
  fieldErrors?: {
    publishAt?: string[]
  }
  formError?: string
  success?: boolean
}

function revalidateContent(id: string) {
  revalidatePath(`/admin/contents/${id}/edit`)
  revalidatePath('/admin/contents')
}

export async function publishContentAction(
  _previousState: PublishActionState,
  formData: FormData,
): Promise<PublishActionState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const result = publishContentSchema.safeParse({
    id: formData.get('id'),
  })

  if (!result.success) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  try {
    await publishContent(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('no tiene un paquete HTML publicado')
    ) {
      return {
        error:
          'Esta tool/insight no tiene un paquete HTML publicado todavía — sube y publica una versión antes de publicar el contenido.',
      }
    }

    return { error: 'No se ha podido publicar el contenido.' }
  }

  await warmContentAfterResponse(result.data.id)

  revalidateContent(result.data.id)

  return { success: true }
}

export async function scheduleContentAction(
  _previousState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = scheduleContentSchema.safeParse({
    id: formData.get('id'),
    publishAt: formData.get('publishAt'),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await scheduleContent(result.data)
  } catch (error) {
    console.error(error)

    if (error instanceof Error && error.message.includes('debe ser futura')) {
      return {
        fieldErrors: {
          publishAt: ['La fecha de publicación debe ser futura.'],
        },
      }
    }

    if (
      error instanceof Error &&
      error.message.includes('no tiene un paquete HTML publicado')
    ) {
      return {
        formError:
          'Esta tool/insight no tiene un paquete HTML publicado todavía — sube y publica una versión antes de programarla.',
      }
    }

    return { formError: 'No se ha podido programar la publicación.' }
  }

  await warmContentAfterResponse(result.data.id)

  revalidateContent(result.data.id)

  return { success: true }
}

export async function unpublishContentAction(
  _previousState: PublishActionState,
  formData: FormData,
): Promise<PublishActionState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const result = unpublishContentSchema.safeParse({
    id: formData.get('id'),
  })

  if (!result.success) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  try {
    await unpublishContent(result.data)
  } catch (error) {
    console.error(error)

    return { error: 'No se ha podido despublicar el contenido.' }
  }

  revalidateContent(result.data.id)

  return { success: true }
}

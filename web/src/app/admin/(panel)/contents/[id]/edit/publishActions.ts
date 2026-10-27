'use server'

import { revalidatePath } from 'next/cache'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { invalidateFeedCache } from '@/lib/cache/feedCache'
import { invalidatePackageCache } from '@/lib/cache/packageCache'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'
import { isDomainError } from '@/modules/shared/domain/domainError'

import {
  publishContentSchema,
  scheduleContentSchema,
  unpublishContentSchema,
} from '@/modules/content/domain/contentSchema'

import {
  publishContent,
  scheduleContent,
  unpublishContent,
} from '@/modules/content/container'
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
  invalidateFeedCache()
  invalidatePackageCache()
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

    return {
      error: adminErrorMessage(
        error,
        'No se ha podido publicar el contenido.',
        ['other_kind_required', 'page_pin_required'],
        {
          package_required:
            'Este contenido no tiene un paquete HTML publicado todavía — sube y publica una versión antes de publicar el contenido.',
        },
      ),
    }
  }

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

    if (isDomainError(error, 'publish_date_in_past')) {
      return {
        fieldErrors: {
          publishAt: ['La fecha de publicación debe ser futura.'],
        },
      }
    }

    return {
      formError: adminErrorMessage(
        error,
        'No se ha podido programar la publicación.',
        ['other_kind_required', 'page_pin_required'],
        {
          package_required:
            'Este contenido no tiene un paquete HTML publicado todavía — sube y publica una versión antes de programarlo.',
        },
      ),
    }
  }

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

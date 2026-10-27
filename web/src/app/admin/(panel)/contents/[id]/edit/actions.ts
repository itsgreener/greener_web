'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'
import { invalidateFeedCache } from '@/lib/cache/feedCache'

import { isDomainError } from '@/modules/shared/domain/domainError'

import { updateContentSchema } from '@/modules/content/domain/contentSchema'

import { updateContent } from '@/modules/content/container'
import {
  fieldErrorsOf,
  type FormActionState,
} from '@/lib/forms/formActionState'

export type UpdateContentActionState = FormActionState<
  'id' | 'slug' | 'defaultLocale'
>

export async function updateContentAction(
  _previousState: UpdateContentActionState,
  formData: FormData,
): Promise<UpdateContentActionState> {
  if (!(await isAdminRequest())) return { formError: ADMIN_REQUIRED_MESSAGE }

  const result = updateContentSchema.safeParse({
    id: formData.get('id'),
    slug: formData.get('slug'),
    defaultLocale: formData.get('defaultLocale'),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await updateContent(result.data)
  } catch (error) {
    if (isDomainError(error, 'duplicate')) {
      return {
        fieldErrors: {
          slug: ['Este slug ya está siendo utilizado'],
        },
      }
    }

    console.error(error)

    return {
      formError: 'No se han podido guardar los cambios.',
    }
  }

  revalidatePath('/admin/contents')

  revalidatePath(`/admin/contents/${result.data.id}/edit`)

  invalidateFeedCache()

  redirect('/admin/contents')
}

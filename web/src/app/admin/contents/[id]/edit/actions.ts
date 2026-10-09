'use server'

import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { updateContentSchema } from '@/modules/content/domain/contentSchema'

import { updateContent } from '@/modules/content/application/updateContent'
import {
  fieldErrorsOf,
  type FormActionState,
} from '@/lib/forms/formActionState'

export type UpdateContentActionState = FormActionState<
  'id' | 'slug' | 'defaultLocale' | 'title'
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
    title: formData.get('title'),
  })

  if (!result.success) {
    return {
      fieldErrors: fieldErrorsOf(result.error),
    }
  }

  try {
    await updateContent(result.data)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
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

  redirect('/admin/contents')
}

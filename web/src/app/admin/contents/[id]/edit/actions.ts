'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import {
  updateContentSchema,
} from '@/modules/content/domain/contentSchema'

import {
  updateContent,
} from '@/modules/content/application/updateContent'

export type UpdateContentActionState = {
  fieldErrors?: {
    id?: string[]
    slug?: string[]
    defaultLocale?: string[]
    title?: string[]
  }

  formError?: string
}

export async function updateContentAction(
  _previousState: UpdateContentActionState,
  formData: FormData
): Promise<UpdateContentActionState> {

  const result =
    updateContentSchema.safeParse({
      id: formData.get('id'),
      slug: formData.get('slug'),
      defaultLocale:
        formData.get('defaultLocale'),
      title: formData.get('title'),
    })

  if (!result.success) {
    return {
      fieldErrors:
        result.error.flatten().fieldErrors,
    }
  }

  try {
    await updateContent(result.data)
  } catch (error) {

    if (
      error instanceof Error &&
      'code' in error &&
      error.code === '23505'
    ) {
      return {
        fieldErrors: {
          slug: [
            'Este slug ya está siendo utilizado'
          ],
        },
      }
    }

    console.error(error)

    return {
      formError:
        'No se han podido guardar los cambios.',
    }
  }

  revalidatePath('/admin/contents')

  revalidatePath(
    `/admin/contents/${result.data.id}/edit`
  )

  redirect('/admin/contents')
}
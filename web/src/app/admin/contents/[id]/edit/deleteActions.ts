'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import {
  deleteContentSchema,
} from '@/modules/content/domain/contentSchema'

import {
  deleteContent,
} from '@/modules/content/application/deleteContent'

export type DeleteContentActionState = {
  error?: string
}

export async function deleteContentAction(
  _previousState: DeleteContentActionState,
  formData: FormData
): Promise<DeleteContentActionState> {
  const result =
    deleteContentSchema.safeParse({
      id: formData.get('id'),
    })

  if (!result.success) {
    return {
      error:
        'El identificador del contenido no es válido.',
    }
  }

  try {
    await deleteContent(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes(
        'Only draft content can be deleted'
      )
    ) {
      return {
        error:
          'Solo se pueden eliminar contenidos en estado draft.',
      }
    }

    if (
      error instanceof Error &&
      error.message.includes(
        'Content not found'
      )
    ) {
      return {
        error:
          'El contenido ya no existe.',
      }
    }

    return {
      error:
        'No se ha podido eliminar el contenido.',
    }
  }

  revalidatePath('/admin/contents')

  redirect('/admin/contents')
}
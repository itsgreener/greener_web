'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'

import { deleteContentSchema } from '@/modules/content/domain/contentSchema'

import { deleteContent } from '@/modules/content/container'

export type DeleteContentActionState = {
  error?: string
}

export async function deleteContentAction(
  _previousState: DeleteContentActionState,
  formData: FormData,
): Promise<DeleteContentActionState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const result = deleteContentSchema.safeParse({
    id: formData.get('id'),
  })

  if (!result.success) {
    return {
      error: 'El identificador del contenido no es válido.',
    }
  }

  let purge: Awaited<ReturnType<typeof deleteContent>>

  try {
    purge = await deleteContent(result.data)
  } catch (error) {
    console.error('Admin · deleteContentAction:', error)

    return {
      error: adminErrorMessage(
        error,
        'No se ha podido eliminar el contenido.',
        ['only_draft_deletable', 'not_found'],
      ),
    }
  }

  // Tras esto hay un redirect, así que un fallo al borrar los archivos no se
  // puede mostrar: queda en el log y lo recoge el reconciliador.
  if (purge.failed > 0) {
    console.error(
      `deleteContentAction: ${purge.failed} archivo(s) sin borrar de Cloudinary (contenido ${result.data.id}).`,
    )
  }

  revalidatePath('/admin/contents')

  redirect('/admin/contents')
}

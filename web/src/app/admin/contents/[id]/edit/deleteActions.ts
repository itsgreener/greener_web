'use server'

import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { deleteContentSchema } from '@/modules/content/domain/contentSchema'

import { deleteContent } from '@/modules/content/application/deleteContent'

import {
  purgeRemovedMedia,
  snapshotContentMedia,
} from '@/modules/media/application/cleanupMedia'

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

  // Medios del contenido (portada, og, pines, carrusel) leídos ANTES de
  // borrarlo, para poder borrar después sus archivos en Cloudinary.
  const mediaRefs = await snapshotContentMedia(result.data.id)

  try {
    await deleteContent(result.data)
  } catch (error) {
    console.error(error)

    if (
      error instanceof Error &&
      error.message.includes('Only draft content can be deleted')
    ) {
      return {
        error: 'Solo se pueden eliminar contenidos en estado draft.',
      }
    }

    if (error instanceof Error && error.message.includes('Content not found')) {
      return {
        error: 'El contenido ya no existe.',
      }
    }

    return {
      error: 'No se ha podido eliminar el contenido.',
    }
  }

  // delete_content ya borró en Postgres los media_asset que se quedaron sin
  // referencias; aquí se borran los archivos reales. Tras esto hay un
  // redirect, así que un fallo no se puede mostrar: queda en el log y lo
  // recoge el reconciliador.
  const purge = await purgeRemovedMedia(mediaRefs)

  if (purge.failed > 0) {
    console.error(
      `deleteContentAction: ${purge.failed} archivo(s) sin borrar de Cloudinary (contenido ${result.data.id}).`,
    )
  }

  revalidatePath('/admin/contents')

  redirect('/admin/contents')
}

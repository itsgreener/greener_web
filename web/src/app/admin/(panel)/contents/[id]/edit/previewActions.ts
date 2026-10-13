'use server'

import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { generatePreviewLink } from '@/modules/content/container'

export type PreviewLinkActionState = {
  url?: string
  error?: string
}

/**
 * Genera el link de preview (arquitectura §15.3) para el contenido dado
 * — el ABM lo muestra para que Greener lo copie y lo comparta a mano con
 * quien deba revisarlo, no se envía automáticamente por ningún canal.
 */
export async function generatePreviewLinkAction(
  _previousState: PreviewLinkActionState,
  formData: FormData,
): Promise<PreviewLinkActionState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const id = formData.get('id')

  if (typeof id !== 'string' || id.length === 0) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  const url = await generatePreviewLink(id)

  if (!url) {
    return { error: 'No se ha encontrado el contenido.' }
  }

  return { url }
}

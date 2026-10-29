'use server'

import {
  ADMIN_REQUIRED_MESSAGE,
  getAdminActor,
  isAdminRequest,
} from '@/lib/auth/adminSession'
import { isUuid } from '@/lib/validation/uuid'

import { recordAuditEvent } from '@/modules/audit/container'
import {
  generatePreviewLink,
  revokePreviewLinks,
} from '@/modules/content/container'

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

  if (!isUuid(id)) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  const url = await generatePreviewLink(id)

  if (!url) {
    return { error: 'No se ha encontrado el contenido.' }
  }

  // El enlace da acceso a contenido sin publicar: queda anotado quién lo
  // generó (SEC-ADM-F1). El resto de acciones sobre contenidos ya las anota
  // la propia base. `recordAuditEvent` no lanza: un fallo del registro no
  // impide entregar el enlace, solo queda en el log del servidor.
  const actor = await getAdminActor()

  if (actor) {
    await recordAuditEvent({
      actorEmail: actor.email,
      action: 'preview_link',
      entity: 'content',
      entityId: id,
    })
  }

  return { url }
}

export type RevokePreviewState = {
  error?: string
  message?: string
}

/**
 * Invalida los enlaces de preview ya generados de un contenido (SEC-ADM-D2):
 * para cuando uno se ha compartido por error y no se quiere esperar a que
 * caduque (24 h). Los enlaces que se generen después funcionan con normalidad.
 * El registro de actividad lo escribe la propia función SQL.
 */
export async function revokePreviewLinksAction(
  _previousState: RevokePreviewState,
  formData: FormData,
): Promise<RevokePreviewState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const id = formData.get('id')

  if (!isUuid(id)) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  try {
    if (!(await revokePreviewLinks(id))) {
      return { error: 'No se ha encontrado el contenido.' }
    }
  } catch (error) {
    console.error('Admin · revokePreviewLinksAction:', error)

    return { error: 'No se han podido revocar los enlaces.' }
  }

  return {
    message:
      'Enlaces revocados: los generados hasta ahora ya no abren el borrador.',
  }
}

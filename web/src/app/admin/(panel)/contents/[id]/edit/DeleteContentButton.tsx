'use client'

import { AdminActionForm } from '@/components/admin/AdminActionForm'
import { AdminMessage } from '@/components/admin/AdminMessage'

import type { ContentStatus } from '@/modules/shared/domain/contentStatus'
import { deleteContentAction } from './deleteActions'

type Props = {
  id: string
  status: ContentStatus
}

export default function DeleteContentButton({ id, status }: Props) {
  if (status !== 'draft') {
    return (
      <AdminMessage>
        Este contenido no se puede eliminar porque no está en estado draft.
      </AdminMessage>
    )
  }

  return (
    <AdminActionForm
      action={deleteContentAction}
      hidden={{ id }}
      variant="danger-solid"
      label="Eliminar contenido"
      pendingLabel="Eliminando…"
      confirmText="¿Seguro que quieres eliminar este contenido? Esta acción no se puede deshacer."
      messagesFirst
    />
  )
}

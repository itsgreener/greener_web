'use client'

import { useActionState } from 'react'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'

import {
  deleteContentAction,
  type DeleteContentActionState,
} from './deleteActions'

import type { ContentStatus } from '@/modules/shared/domain/contentStatus'
type Props = {
  id: string
  status: ContentStatus
}

const initialState: DeleteContentActionState = {}

export default function DeleteContentButton({ id, status }: Props) {
  const [state, formAction, pending] = useActionState(
    deleteContentAction,
    initialState,
  )

  if (status !== 'draft') {
    return (
      <AdminMessage>
        Este contenido no se puede eliminar porque no está en estado draft.
      </AdminMessage>
    )
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          '¿Seguro que quieres eliminar este contenido? Esta acción no se puede deshacer.',
        )

        if (!confirmed) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />

      {state.error && <AdminMessage kind="error">{state.error}</AdminMessage>}

      <AdminButton type="submit" variant="danger-solid" disabled={pending}>
        {pending ? 'Eliminando...' : 'Eliminar contenido'}
      </AdminButton>
    </form>
  )
}

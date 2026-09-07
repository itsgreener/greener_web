'use client'

import { useActionState } from 'react'

import type { ContentStatus } from '@/modules/content/domain/contentRepository'

import {
  deleteContentAction,
  type DeleteContentActionState,
} from './deleteActions'

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
      <div>
        <p>
          Este contenido no se puede eliminar porque no está en estado draft.
        </p>
      </div>
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

      {state.error && <p>{state.error}</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Eliminando...' : 'Eliminar contenido'}
      </button>
    </form>
  )
}

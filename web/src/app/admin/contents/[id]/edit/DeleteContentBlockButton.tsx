'use client'

import {
  useActionState,
} from 'react'

import {
  deleteBlockAction,
  type DeleteBlockActionState,
} from './blockActions'

type Props = {
  id: string
  contentId: string
}

const initialState:
  DeleteBlockActionState = {}

export default function DeleteContentBlockButton({
  id,
  contentId,
}: Props) {

  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    deleteBlockAction,
    initialState
  )

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const confirmed =
          window.confirm(
            '¿Seguro que quieres eliminar este bloque? Sus traducciones también se eliminarán.'
          )

        if (!confirmed) {
          event.preventDefault()
        }
      }}
    >

      <input
        type="hidden"
        name="id"
        value={id}
      />

      <input
        type="hidden"
        name="contentId"
        value={contentId}
      />

      {state.error && (
        <p>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
      >
        {pending
          ? 'Eliminando...'
          : 'Eliminar bloque'}
      </button>

    </form>
  )
}
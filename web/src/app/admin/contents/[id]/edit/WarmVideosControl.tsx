'use client'

import { useActionState } from 'react'

import { warmContentAction, type WarmActionState } from './warmActions'

type Props = {
  contentId: string
  /** Vídeos del contenido sin calentar; null si no se pudo comprobar. */
  pending: number | null
}

const initialState: WarmActionState = {}

export default function WarmVideosControl({ contentId, pending }: Props) {
  const [state, action, warming] = useActionState(
    warmContentAction,
    initialState,
  )

  if (pending === 0 && !state.message && !state.error) {
    return (
      <p className="admin-field-hint">
        Vídeos calentados: no hay ninguno pendiente.
      </p>
    )
  }

  return (
    <form action={action} className="admin-warm-videos">
      <input type="hidden" name="id" value={contentId} />

      <button
        type="submit"
        className="admin-button admin-button-secondary"
        disabled={warming}
      >
        {warming ? 'Calentando...' : 'Calentar vídeos'}
      </button>

      <small>
        {pending === null
          ? 'No se ha podido comprobar cuántos vídeos faltan por calentar.'
          : `${pending} vídeo(s) sin calentar. Se calientan solos al publicar o programar.`}
      </small>

      {state.message && <p className="admin-field-hint">{state.message}</p>}

      {state.error && <p className="admin-form-error">{state.error}</p>}
    </form>
  )
}

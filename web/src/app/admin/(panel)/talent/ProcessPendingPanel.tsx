'use client'

import { useActionState } from 'react'

import { processPendingCvsAction, type TalentActionState } from './actions'

const initialState: TalentActionState = {}

type Props = {
  pending: number
  started: number
}

/**
 * Lanza `Procesar nuevo CV` a mano: para las filas que se quedaron en
 * `pending` porque había otro procesado en marcha. «Lanzar igualmente» solo
 * aparece cuando el control de «Procesando» ha parado el lanzamiento: quien lo
 * pulsa asume que esas filas están atascadas y no hay un procesado de verdad.
 */
export default function ProcessPendingPanel({ pending, started }: Props) {
  const [state, action, isPending] = useActionState(
    processPendingCvsAction,
    initialState,
  )

  return (
    <div className="admin-talent-process">
      <p>
        {pending} {pending === 1 ? 'CV pendiente' : 'CVs pendientes'} de
        procesar
        {started > 0 ? ` y ${started} en «Procesando».` : '.'}
      </p>

      <div className="admin-talent-process-actions">
        <form action={action}>
          <button
            type="submit"
            className="admin-button admin-button-secondary"
            disabled={isPending || pending === 0}
          >
            {isPending ? 'Lanzando…' : 'Procesar pendientes'}
          </button>
        </form>

        {state.canForce && (
          <form
            action={action}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  '¿Lanzar igualmente? Si n8n sigue procesando de verdad, los CVs pendientes se procesarán dos veces (coste de OpenAI y ficheros duplicados en Drive). Hazlo solo si las filas de «Procesando» llevan tiempo atascadas.',
                )
              ) {
                event.preventDefault()
              }
            }}
          >
            <input type="hidden" name="force" value="true" />

            <button
              type="submit"
              className="admin-button admin-button-secondary"
              disabled={isPending}
            >
              Lanzar igualmente
            </button>
          </form>
        )}
      </div>

      {state.error && <p className="admin-form-error">{state.error}</p>}

      {state.message && <p className="admin-form-success">{state.message}</p>}
    </div>
  )
}

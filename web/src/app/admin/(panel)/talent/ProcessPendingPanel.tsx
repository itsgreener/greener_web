'use client'

import { useActionState } from 'react'

import { confirmSubmit } from '@/components/admin/AdminActionForm'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'

import { processPendingCvsAction, type TalentActionState } from './actions'
import styles from './ProcessPendingPanel.module.css'

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
    <AdminMessage as="div" kind="warning" inset className={styles.panel}>
      <p className={styles.text}>
        {pending} {pending === 1 ? 'CV pendiente' : 'CVs pendientes'} de
        procesar
        {started > 0 ? ` y ${started} en «Procesando».` : '.'}
      </p>

      <div className={styles.actions}>
        <form action={action}>
          <AdminButton type="submit" disabled={isPending || pending === 0}>
            {isPending ? 'Lanzando…' : 'Procesar pendientes'}
          </AdminButton>
        </form>

        {state.canForce && (
          <form
            action={action}
            onSubmit={confirmSubmit(
              '¿Lanzar igualmente? Si n8n sigue procesando de verdad, los CVs pendientes se procesarán dos veces (coste de OpenAI y ficheros duplicados en Drive). Hazlo solo si las filas de «Procesando» llevan tiempo atascadas.',
            )}
          >
            <input type="hidden" name="force" value="true" />

            <AdminButton type="submit" disabled={isPending}>
              Lanzar igualmente
            </AdminButton>
          </form>
        )}
      </div>

      {state.error && <AdminMessage kind="error">{state.error}</AdminMessage>}

      {state.message && (
        <AdminMessage kind="success">{state.message}</AdminMessage>
      )}
    </AdminMessage>
  )
}

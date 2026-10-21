'use client'

import { useActionState } from 'react'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'

import {
  deleteCandidateAction,
  reprocessCandidateAction,
  resendFormLinkAction,
  type TalentActionState,
} from '@/app/admin/(panel)/talent/actions'

import styles from './CandidateActions.module.css'

const initialState: TalentActionState = {}

type Props = {
  candidateId: string
  canReprocess: boolean
  canResend: boolean
}

function ActionForm({
  action,
  candidateId,
  label,
  pendingLabel,
  confirmText,
  danger = false,
}: {
  action: (
    previous: TalentActionState,
    formData: FormData,
  ) => Promise<TalentActionState>
  candidateId: string
  label: string
  pendingLabel: string
  confirmText: string
  danger?: boolean
}) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault()
      }}
    >
      <input type="hidden" name="candidateId" value={candidateId} />

      <AdminButton
        type="submit"
        variant={danger ? 'danger' : 'secondary'}
        disabled={isPending}
      >
        {isPending ? pendingLabel : label}
      </AdminButton>

      {state.error && <AdminMessage kind="error">{state.error}</AdminMessage>}

      {state.message && (
        <AdminMessage kind="success">{state.message}</AdminMessage>
      )}
    </form>
  )
}

export default function CandidateActions({
  candidateId,
  canReprocess,
  canResend,
}: Props) {
  return (
    <div className={styles.actions}>
      {canReprocess && (
        <ActionForm
          action={reprocessCandidateAction}
          candidateId={candidateId}
          label="Reprocesar CV"
          pendingLabel="Reprocesando…"
          confirmText="¿Reprocesar este CV? Vuelve a «Pendiente de procesar» y n8n lo analiza de nuevo."
        />
      )}

      {canResend && (
        <ActionForm
          action={resendFormLinkAction}
          candidateId={candidateId}
          label="Reenviar enlace del formulario"
          pendingLabel="Enviando…"
          confirmText="¿Reenviar el enlace del formulario a este candidato? Recibirá un email."
        />
      )}

      <ActionForm
        action={deleteCandidateAction}
        candidateId={candidateId}
        label="Eliminar candidato"
        pendingLabel="Eliminando…"
        danger
        confirmText="¿Eliminar a este candidato? Se borran de forma definitiva sus datos, sus proyectos y sus ficheros del bucket. El CV que ya esté en Google Drive y la suscripción de Mailchimp hay que quitarlos a mano. No se puede deshacer."
      />
    </div>
  )
}

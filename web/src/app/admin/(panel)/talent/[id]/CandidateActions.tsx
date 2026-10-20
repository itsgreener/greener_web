'use client'

import { useActionState } from 'react'

import {
  reprocessCandidateAction,
  resendFormLinkAction,
  type TalentActionState,
} from '@/app/admin/(panel)/talent/actions'

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
}: {
  action: (
    previous: TalentActionState,
    formData: FormData,
  ) => Promise<TalentActionState>
  candidateId: string
  label: string
  pendingLabel: string
  confirmText: string
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

      <button
        type="submit"
        className="admin-button admin-button-secondary"
        disabled={isPending}
      >
        {isPending ? pendingLabel : label}
      </button>

      {state.error && <p className="admin-form-error">{state.error}</p>}

      {state.message && <p className="admin-form-success">{state.message}</p>}
    </form>
  )
}

export default function CandidateActions({
  candidateId,
  canReprocess,
  canResend,
}: Props) {
  return (
    <div className="admin-talent-actions">
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
    </div>
  )
}

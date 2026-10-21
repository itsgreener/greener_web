'use client'

import { useActionState } from 'react'

import {
  deleteCandidateAction,
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

      <button
        type="submit"
        className={
          danger
            ? 'admin-button admin-button-danger'
            : 'admin-button admin-button-secondary'
        }
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

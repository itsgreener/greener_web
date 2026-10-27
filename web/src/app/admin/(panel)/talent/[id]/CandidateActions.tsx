'use client'

import { AdminActionForm } from '@/components/admin/AdminActionForm'

import {
  deleteCandidateAction,
  reprocessCandidateAction,
  resendFormLinkAction,
} from '@/app/admin/(panel)/talent/actions'

import styles from './CandidateActions.module.css'

type Props = {
  candidateId: string
  canReprocess: boolean
  canResend: boolean
}

export default function CandidateActions({
  candidateId,
  canReprocess,
  canResend,
}: Props) {
  const hidden = { candidateId }

  return (
    <div className={styles.actions}>
      {canReprocess && (
        <AdminActionForm
          action={reprocessCandidateAction}
          hidden={hidden}
          variant="secondary"
          label="Reprocesar CV"
          pendingLabel="Reprocesando…"
          confirmText="¿Reprocesar este CV? Vuelve a «Pendiente de procesar» y n8n lo analiza de nuevo."
        />
      )}

      {canResend && (
        <AdminActionForm
          action={resendFormLinkAction}
          hidden={hidden}
          variant="secondary"
          label="Reenviar enlace del formulario"
          pendingLabel="Enviando…"
          confirmText="¿Reenviar el enlace del formulario a este candidato? Recibirá un email."
        />
      )}

      <AdminActionForm
        action={deleteCandidateAction}
        hidden={hidden}
        variant="danger"
        label="Eliminar candidato"
        pendingLabel="Eliminando…"
        confirmText="¿Eliminar a este candidato? Se borran de forma definitiva sus datos, sus proyectos y sus ficheros del bucket. El CV que ya esté en Google Drive y la suscripción de Mailchimp hay que quitarlos a mano. No se puede deshacer."
      />
    </div>
  )
}

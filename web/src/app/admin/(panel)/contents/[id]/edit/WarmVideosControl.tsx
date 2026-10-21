'use client'

import { useActionState } from 'react'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'

import styles from './WarmVideosControl.module.css'
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
      <p className={styles.hint}>
        Vídeos calentados: no hay ninguno pendiente.
      </p>
    )
  }

  return (
    <form action={action} className={styles.warm}>
      <input type="hidden" name="id" value={contentId} />

      <AdminButton type="submit" disabled={warming}>
        {warming ? 'Calentando...' : 'Calentar vídeos'}
      </AdminButton>

      <small className={styles.hint}>
        {pending === null
          ? 'No se ha podido comprobar cuántos vídeos faltan por calentar.'
          : `${pending} vídeo(s) sin calentar. Se calientan solos al publicar o programar.`}
      </small>

      {state.message && (
        <AdminMessage kind="success">{state.message}</AdminMessage>
      )}

      {state.error && <AdminMessage kind="error">{state.error}</AdminMessage>}
    </form>
  )
}

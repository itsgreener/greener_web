import Link from 'next/link'

import { CtaButton } from '@/components/cta/Cta'
import { embedConsentCopy } from './copy'
import styles from './EmbedConsentPrompt.module.css'

type Props = {
  /** Nombre del proveedor tal y como se enseña («YouTube», «Spotify»). */
  provider: string
  onAccept: () => void
  onCancel: () => void
}

/**
 * Petición de consentimiento al pulsar play (ventana de cookies, 13 oct
 * 2026): se muestra cuando el visitante aún no ha aceptado las cookies. Nada
 * de YouTube ni de Spotify se carga hasta que acepta. Ocupa el marco del
 * reproductor, sobre la portada.
 */
export function EmbedConsentPrompt({ provider, onAccept, onCancel }: Props) {
  const copy = embedConsentCopy(provider)

  return (
    <div className={styles.prompt}>
      <p className={styles.title}>{copy.title}</p>
      <p className={styles.text}>{copy.intro}</p>
      <p className={styles.text}>
        {copy.remembered}{' '}
        <Link href="/privacy#cookies" target="_blank" rel="noopener">
          {copy.policyLink}
        </Link>
      </p>
      <div className={styles.actions}>
        <CtaButton type="button" onClick={onAccept}>
          {copy.accept}
        </CtaButton>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          {copy.cancel}
        </button>
      </div>
    </div>
  )
}

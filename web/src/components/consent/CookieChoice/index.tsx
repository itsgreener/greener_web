'use client'

import { ConsentButtons } from '@/components/consent/ConsentButtons'
import { useConsent } from '@/modules/consent/client/ConsentProvider'
import { useConsentCopy } from '@/modules/consent/client/useConsentCopy'
import { COOKIE_CHOICE_ANCHOR } from '@/modules/consent/domain/copy'
import styles from './CookieChoice.module.css'

/**
 * Dónde se cambia la decisión de cookies, en `/privacy` (a la que lleva
 * «Cookies» en el menú lateral). Revocar es tan fácil como aceptar: el mismo
 * par de botones iguales de la ventana. Hasta que se lee la cookie propia
 * (`unknown`) no se afirma nada sobre la decisión actual.
 */
export function CookieChoice() {
  const { status } = useConsent()
  const copy = useConsentCopy()

  return (
    <section
      id={COOKIE_CHOICE_ANCHOR}
      className={styles.choice}
      aria-labelledby="cookie-choice-heading"
    >
      <h2 id="cookie-choice-heading" className={styles.heading}>
        {copy.choiceHeading}
      </h2>
      <p className={styles.status} role="status">
        {status === 'unknown' ? '\u00a0' : copy.choiceStatus(status)}
      </p>
      <div className={styles.actions}>
        <ConsentButtons className={styles.button} showCurrentChoice />
      </div>
    </section>
  )
}

'use client'

import { useConsent } from '@/modules/consent/client/ConsentProvider'
import {
  CONSENT_COPY,
  COOKIE_CHOICE_ANCHOR,
  DEFAULT_CONSENT_LOCALE,
} from '@/modules/consent/domain/copy'
import styles from './CookieChoice.module.css'

/**
 * Dónde se cambia la decisión de cookies, en `/privacy` (a la que lleva
 * «Cookies» en el menú lateral). Revocar es tan fácil como aceptar: el mismo
 * par de botones iguales de la ventana. Hasta que se lee la cookie propia
 * (`unknown`) no se afirma nada sobre la decisión actual.
 */
export function CookieChoice() {
  const { status, accept, reject } = useConsent()
  const copy = CONSENT_COPY[DEFAULT_CONSENT_LOCALE]

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
        <button
          type="button"
          className={styles.button}
          aria-pressed={status === 'accepted'}
          onClick={accept}
        >
          {copy.accept}
        </button>
        <button
          type="button"
          className={styles.button}
          aria-pressed={status === 'rejected'}
          onClick={reject}
        >
          {copy.reject}
        </button>
      </div>
    </section>
  )
}

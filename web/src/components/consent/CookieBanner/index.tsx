'use client'

import Link from 'next/link'

import {
  CONSENT_COPY,
  DEFAULT_CONSENT_LOCALE,
} from '@/modules/consent/domain/copy'
import { useConsent } from '@/modules/consent/client/ConsentProvider'
import styles from './CookieBanner.module.css'

/**
 * Ventana de cookies. Fija abajo y sin bloquear: se puede seguir navegando y
 * haciendo scroll con ella a la vista, y solo Aceptar, Rechazar o la X la
 * cierran (la X rechaza). Aceptar y Rechazar son el mismo botón en tamaño,
 * color y peso: rechazar cuesta un clic, igual que aceptar.
 *
 * No roba el foco al cargar la página. Una vez decidido no vuelve a salir
 * (salvo que cambie el texto o pasen 24 meses); la decisión se cambia desde
 * `/privacy`, a la que lleva «Cookies» en el menú lateral.
 */
export function CookieBanner() {
  const { panelOpen, accept, reject, dismiss } = useConsent()
  const copy = CONSENT_COPY[DEFAULT_CONSENT_LOCALE]

  if (!panelOpen) return null

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className={styles.banner}
    >
      <div className={styles.text}>
        <h2 id="cookie-banner-title" className={styles.title}>
          {copy.title}
        </h2>
        <p id="cookie-banner-body" className={styles.body}>
          {copy.body}
        </p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={accept}>
          {copy.accept}
        </button>
        <button type="button" className={styles.button} onClick={reject}>
          {copy.reject}
        </button>
        <Link href="/privacy#cookies" className={styles.link}>
          {copy.policyLink}
        </Link>
      </div>

      <button
        type="button"
        className={styles.close}
        onClick={dismiss}
        aria-label={copy.close}
      >
        <span aria-hidden="true">×</span>
      </button>
    </section>
  )
}

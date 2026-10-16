'use client'

import { useActionState, useEffect, useId, useRef } from 'react'
import Link from 'next/link'

import {
  subscribeNewsletterAction,
  type NewsletterActionState,
} from '@/app/_actions/newsletterActions'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import type { FeedNewsletterItem } from '@/modules/feed/domain/feedReadModels'
import type { PinCardStyle } from '@/components/pin/PinCard'
import styles from './NewsletterPinCard.module.css'

const initialState: NewsletterActionState = {}

/**
 * Pin de newsletter del feed (plan de `other`, fase 3): tarjeta nativa de una
 * columna y proporción 4:5, con titular, texto de apoyo, email y botón. No es
 * un enlace: el formulario es el contenido. Reutiliza `subscribeToNewsletter`
 * (honeypot, límite por IP, respuesta neutra de Mailchimp) a través de la
 * Server Action, que además deja la cookie `greener_newsletter`.
 *
 * Antes del botón lleva la primera capa de información de protección de
 * datos: una línea con el enlace a `/privacy#newsletter`.
 *
 * Al suscribirse muestra el mensaje de éxito en la misma tarjeta (la retícula
 * no se mueve) y avisa con `onSubscribed` para que el feed retire las demás
 * tarjetas de newsletter que ya tuviera cargadas.
 */
export function NewsletterPinCard({
  item,
  style,
  onSubscribed,
}: {
  item: FeedNewsletterItem
  style: PinCardStyle
  onSubscribed: (pinId: string) => void
}) {
  const [state, formAction, pending] = useActionState(
    subscribeNewsletterAction,
    initialState,
  )
  const emailId = useId()
  const reported = useRef(false)

  useEffect(() => {
    if (!state.success || reported.current) return
    reported.current = true

    // Solo las altas nuevas cuentan (como en el resto de la analítica de
    // altas): «pendiente» y «ya suscrito» no suman.
    if (state.newSubscription) {
      trackAnalyticsEvent(
        'Newsletter Signup',
        { placement: 'feed' },
        { interactive: true },
      )
    }

    onSubscribed(item.pinId)
  }, [state, item.pinId, onSubscribed])

  const emailError = state.fieldErrors?.email?.[0]

  return (
    <section
      className={styles.card}
      style={{
        transform: `translate(${style.x}px, ${style.y}px)`,
        width: style.width,
      }}
      aria-label="Newsletter"
    >
      <div className={styles.inner}>
        {state.success ? (
          // Con el alta hecha la tarjeta solo enseña la confirmación: en la
          // columna más estrecha no cabría junto al titular.
          <p className={styles.success} role="status">
            {state.message}
          </p>
        ) : (
          <>
            <div className={styles.copy}>
              <h2 className={`${styles.title} text-display`}>{item.title}</h2>
              {item.text && <p className={styles.text}>{item.text}</p>}
            </div>

            <form action={formAction} className={styles.form}>
              {/* Honeypot: fuera de pantalla, no display:none (ver ContactForm). */}
              <div className={styles.honeypot} aria-hidden="true">
                <label htmlFor={`${emailId}-company`}>Company</label>
                <input
                  id={`${emailId}-company`}
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <label htmlFor={emailId} className={styles.srOnly}>
                Email
              </label>
              <input
                id={emailId}
                name="newsletterEmail"
                type="email"
                placeholder="Email"
                autoComplete="email"
                required
                className={styles.input}
              />
              {(emailError || state.formError) && (
                <p className={styles.error} role="alert">
                  {emailError ?? state.formError}
                </p>
              )}

              <p className={styles.legal}>
                How we use your email and the cookie this saves:{' '}
                <Link href="/privacy#newsletter">Privacy</Link>
              </p>

              <button
                type="submit"
                disabled={pending}
                className={styles.submit}
              >
                {pending ? 'Sending…' : 'Subscribe'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}

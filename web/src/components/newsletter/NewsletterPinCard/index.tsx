'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'

import {
  subscribeNewsletterAction,
  type NewsletterActionState,
} from '@/app/_actions/newsletterActions'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import type { FeedNewsletterItem } from '@/modules/feed/domain/feedReadModels'
import { BrokenHeadline } from '@/components/text/BrokenHeadline'
import { Honeypot } from '@/components/security/Honeypot'
import { cardPositionStyle, type PinCardStyle } from '@/components/pin/PinCard'
import styles from './NewsletterPinCard.module.css'

const initialState: NewsletterActionState = {}

const NEWSLETTER_HEADLINE = [
  'Like what',
  'you see? We’ll',
  'write you',
  'when there’s',
  'more',
]

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
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

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
      style={cardPositionStyle(style)}
      aria-label="Newsletter"
    >
      <div className={styles.inner}>
        {state.success ? (
          <div className={styles.success} role="status">
            {state.message}
          </div>
        ) : (
          <>
            <BrokenHeadline
              lines={NEWSLETTER_HEADLINE}
              className={styles.headline}
            />
            <form action={formAction} className={styles.form}>
              <Honeypot
                name="company"
                id={`${emailId}-company`}
                label="Company"
              />
              <label htmlFor={emailId} className="visually-hidden">
                Your email
              </label>
              <input
                id={emailId}
                name="newsletterEmail"
                type="email"
                placeholder="Your email here"
                autoComplete="email"
                required
                className={styles.input}
              />
              {(emailError || state.formError) && (
                <p className={styles.error} role="alert">
                  {emailError ?? state.formError}
                </p>
              )}
              <div className={styles.bottomRow}>
                <label className={styles.legal}>
                  <input
                    type="checkbox"
                    name="privacyAccepted"
                    checked={privacyAccepted}
                    onChange={(event) =>
                      setPrivacyAccepted(event.target.checked)
                    }
                    className={styles.checkbox}
                  />
                  <span>
                    I agree to the{' '}
                    <Link
                      href="/privacy#newsletter"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={pending || !privacyAccepted}
                  aria-label={
                    pending ? 'Sending subscription' : 'Subscribe to newsletter'
                  }
                  className={styles.submit}
                >
                  {pending ? 'Sending…' : 'Subscribe'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}

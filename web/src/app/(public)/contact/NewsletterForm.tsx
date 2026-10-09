'use client'

import Link from 'next/link'
import { useActionState, useEffect } from 'react'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import {
  subscribeNewsletterAction,
  type NewsletterActionState,
} from './newsletterActions'
import styles from './NewsletterForm.module.css'

const initialState: NewsletterActionState = {}

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(
    subscribeNewsletterAction,
    initialState,
  )

  // «Newsletter Signup» solo para altas nuevas: no para quien ya estaba
  // suscrito o pendiente, ni para el éxito silencioso del honeypot.
  const signedUp = state.success === true && state.newSubscription === true

  useEffect(() => {
    if (signedUp) {
      trackAnalyticsEvent('Newsletter Signup', { placement: 'contact' })
    }
  }, [signedUp])

  if (state.success) {
    return <p className={styles.success}>{state.message}</p>
  }

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="newsletter-company">Company</label>
        <input
          id="newsletter-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="newsletter-email">Email</label>
          <input
            id="newsletter-email"
            name="newsletterEmail"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
          {state.fieldErrors?.email?.[0] && (
            <p className={styles.error}>{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <button type="submit" disabled={pending} className={styles.submit}>
          {pending ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>

      <p className={styles.legal}>
        By subscribing, you agree to receive Greener&apos;s newsletter. See our{' '}
        <Link href="/privacy" target="_blank" rel="noopener">
          Privacy &amp; Cookies policy
        </Link>
        .
      </p>

      {state.formError && <p className={styles.error}>{state.formError}</p>}
    </form>
  )
}

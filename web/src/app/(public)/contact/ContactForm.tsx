'use client'

import { useActionState } from 'react'
import { submitContactAction, type ContactActionState } from './contactActions'
import styles from './ContactForm.module.css'

const initialState: ContactActionState = {}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactAction,
    initialState,
  )

  if (state.success) {
    return (
      <p className={styles.success}>
        Gracias por escribirnos — te responderemos lo antes posible.
      </p>
    )
  }

  return (
    <form action={formAction} className={styles.form}>
      {/* Honeypot: oculto por CSS, no display:none/type=hidden — algunos
          bots evitan justamente esos dos casos. tabIndex/autoComplete
          impiden que un visitante real llegue a él sin querer. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required />
        {state.fieldErrors?.name?.[0] && <p>{state.fieldErrors.name[0]}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" required />
        {state.fieldErrors?.phone?.[0] && <p>{state.fieldErrors.phone[0]}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
        {state.fieldErrors?.email?.[0] && <p>{state.fieldErrors.email[0]}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={6} required />
        {state.fieldErrors?.message?.[0] && (
          <p>{state.fieldErrors.message[0]}</p>
        )}
      </div>

      <div className={styles.consent}>
        <label htmlFor="privacyConsent">
          <input
            id="privacyConsent"
            name="privacyConsent"
            type="checkbox"
            required
          />
          I agree to the privacy policy
        </label>
        {state.fieldErrors?.privacyConsent?.[0] && (
          <p>{state.fieldErrors.privacyConsent[0]}</p>
        )}
      </div>

      {state.formError && <p className={styles.formError}>{state.formError}</p>}

      <button type="submit" disabled={pending} className={styles.submit}>
        {pending ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}

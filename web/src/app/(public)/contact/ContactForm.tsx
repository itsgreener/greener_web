'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { CtaButton } from '@/components/cta/Cta'
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
      <div className="honeypot" aria-hidden="true">
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

      {/* Aviso informativo y botón en una misma fila (space-between). La
          casilla NO es un consentimiento (texto legal de /privacy, 19 oct
          2026): el tratamiento se basa en la solicitud de quien escribe, así
          que no es obligatoria, empieza sin marcar, no tiene `name` y no
          viaja con el formulario. */}
      <div className={styles.actions}>
        <div className={styles.consent}>
          <label htmlFor="privacyRead">
            <input id="privacyRead" type="checkbox" />I have read the{' '}
            <Link href="/privacy#privacy" target="_blank" rel="noopener">
              privacy policy
            </Link>
          </label>
        </div>

        <CtaButton type="submit" pending={pending}>
          {pending ? 'Sending…' : 'Send'}
        </CtaButton>
      </div>

      {state.formError && <p className={styles.formError}>{state.formError}</p>}
    </form>
  )
}

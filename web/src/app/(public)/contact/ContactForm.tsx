'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { CtaButton } from '@/components/cta/Cta'
import { PublicField } from '@/components/form/PublicField'
import { Honeypot } from '@/components/security/Honeypot'
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
        Thanks for writing to us — we&apos;ll get back to you as soon as
        possible.
      </p>
    )
  }

  return (
    <form action={formAction} className={styles.form}>
      <Honeypot
        name="reference_code"
        id="reference_code"
        label="Reference code"
      />

      <PublicField
        name="name"
        label="Name"
        required
        error={state.fieldErrors?.name?.[0]}
      />
      <PublicField
        name="phone"
        label="Phone"
        type="tel"
        required
        error={state.fieldErrors?.phone?.[0]}
      />
      <PublicField
        name="email"
        label="Email"
        type="email"
        required
        error={state.fieldErrors?.email?.[0]}
      />
      <PublicField
        name="message"
        label="Message"
        rows={6}
        required
        error={state.fieldErrors?.message?.[0]}
      />

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

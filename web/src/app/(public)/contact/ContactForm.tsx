'use client'

import { useActionState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CtaButton } from '@/components/cta/Cta'
import { PublicField } from '@/components/form/PublicField'
import { Honeypot } from '@/components/security/Honeypot'
import { CONTACT_LIMITS } from '@/modules/contact/domain/contactLimits'
import { submitContactAction, type ContactActionState } from './contactActions'
import styles from './ContactForm.module.css'

const initialState: ContactActionState = {}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactAction,
    initialState,
  )
  const formRef = useRef<HTMLFormElement>(null)

  // Tras un fallo de validación, el foco va al primer campo con error: el
  // envío recarga el formulario y, si no, el foco se queda en el botón.
  useEffect(() => {
    if (!state.fieldErrors) return

    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus()
  }, [state])

  if (state.success) {
    // El formulario desaparece al enviarse: sin mover el foco al mensaje, se
    // perdería (se queda en un botón que ya no existe) y quien usa lector de
    // pantalla no se enteraría de que el envío salió bien.
    return (
      <p
        className={styles.success}
        role="status"
        tabIndex={-1}
        ref={(node) => node?.focus()}
      >
        Thanks for writing to us — we&apos;ll get back to you as soon as
        possible.
      </p>
    )
  }

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      <Honeypot
        name="reference_code"
        id="reference_code"
        label="Reference code"
      />

      <PublicField
        name="name"
        label="Name"
        required
        autoComplete="name"
        maxLength={CONTACT_LIMITS.name}
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name?.[0]}
      />
      <PublicField
        name="phone"
        label="Phone"
        type="tel"
        required
        autoComplete="tel"
        maxLength={CONTACT_LIMITS.phone}
        defaultValue={state.values?.phone}
        error={state.fieldErrors?.phone?.[0]}
      />
      <PublicField
        name="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        maxLength={CONTACT_LIMITS.email}
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email?.[0]}
      />
      <PublicField
        name="message"
        label="Message"
        rows={6}
        required
        autoComplete="off"
        maxLength={CONTACT_LIMITS.message}
        defaultValue={state.values?.message}
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

      {state.formError && (
        <p className={styles.formError} role="alert">
          {state.formError}
        </p>
      )}
    </form>
  )
}

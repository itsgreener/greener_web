'use client'

import { useConsent } from '@/modules/consent/client/ConsentProvider'
import { useConsentCopy } from '@/modules/consent/client/useConsentCopy'

type Props = {
  /** Clase del botón; en las dos superficies compone `consentButton`. */
  className: string

  /** Marca con `aria-pressed` la decisión vigente (bloque de `/privacy`). */
  showCurrentChoice?: boolean
}

/**
 * El par Aceptar / Rechazar de las dos superficies de consentimiento
 * (CookieBanner y CookieChoice): mismo orden, mismo texto y misma clase para
 * los dos, de modo que rechazar cuesta lo mismo que aceptar. Devuelve los dos
 * botones sueltos; el contenedor lo pone cada superficie.
 */
export function ConsentButtons({
  className,
  showCurrentChoice = false,
}: Props) {
  const { status, accept, reject } = useConsent()
  const copy = useConsentCopy()

  return (
    <>
      <button
        type="button"
        className={className}
        aria-pressed={showCurrentChoice ? status === 'accepted' : undefined}
        onClick={accept}
      >
        {copy.accept}
      </button>
      <button
        type="button"
        className={className}
        aria-pressed={showCurrentChoice ? status === 'rejected' : undefined}
        onClick={reject}
      >
        {copy.reject}
      </button>
    </>
  )
}

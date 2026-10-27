import {
  CONSENT_COPY,
  DEFAULT_CONSENT_LOCALE,
} from '@/modules/consent/domain/copy'

/**
 * Textos de las superficies de consentimiento en el idioma por defecto.
 * Único sitio que decide el idioma: si algún día se localiza, cambia aquí y
 * no en cada componente.
 */
export function useConsentCopy() {
  return CONSENT_COPY[DEFAULT_CONSENT_LOCALE]
}

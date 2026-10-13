'use client'

import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  parseConsent,
  serializeConsent,
  type ConsentRecord,
} from '@/modules/consent/domain/consent'

/**
 * Lectura y escritura de la cookie `greener_consent` desde el navegador.
 * No es HttpOnly a propósito: la lee el cliente para decidir si monta los
 * reproductores. Es una cookie propia de preferencias, exenta de
 * consentimiento (art. 22.2 LSSI), sin identificador.
 */

export function readConsentRecord(): ConsentRecord | null {
  if (typeof document === 'undefined') return null

  try {
    const prefix = `${CONSENT_COOKIE_NAME}=`
    const entry = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))

    return parseConsent(entry ? entry.slice(prefix.length) : null)
  } catch {
    return null
  }
}

export function writeConsentRecord(record: ConsentRecord): void {
  if (typeof document === 'undefined') return

  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''

    document.cookie =
      `${CONSENT_COOKIE_NAME}=${serializeConsent(record)}` +
      `; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
  } catch {
    // Cookies bloqueadas: la decisión vive solo en memoria durante esta
    // visita y se volverá a preguntar en la siguiente.
  }
}

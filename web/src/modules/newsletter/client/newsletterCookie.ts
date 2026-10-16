import {
  NEWSLETTER_COOKIE_NAME,
  NEWSLETTER_COOKIE_VALUE,
} from '@/modules/newsletter/domain/newsletterCookie'

/**
 * ¿Este dispositivo ya se suscribió? Lee la cookie `greener_newsletter` desde
 * el navegador. Solo sirve para filtrar el estado del feed restaurado de
 * `sessionStorage` y para retirar tarjetas ya cargadas; la decisión de no
 * traer más la toma el servidor leyendo la misma cookie.
 */
export function hasNewsletterCookie(): boolean {
  if (typeof document === 'undefined') return false

  try {
    const prefix = `${NEWSLETTER_COOKIE_NAME}=`
    const entry = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))

    return entry?.slice(prefix.length) === NEWSLETTER_COOKIE_VALUE
  } catch {
    return false
  }
}

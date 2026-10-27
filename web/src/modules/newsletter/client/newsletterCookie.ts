import { readBrowserCookie } from '@/lib/clientCookie'
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
  return readBrowserCookie(NEWSLETTER_COOKIE_NAME) === NEWSLETTER_COOKIE_VALUE
}

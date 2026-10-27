'use server'

import { cookies } from 'next/headers'

import { NEWSLETTER_SUCCESS_MESSAGE } from '@/modules/newsletter/domain/newsletterMessages'
import {
  NEWSLETTER_COOKIE_MAX_AGE_SECONDS,
  NEWSLETTER_COOKIE_NAME,
  NEWSLETTER_COOKIE_VALUE,
} from '@/modules/newsletter/domain/newsletterCookie'
import { subscribeToNewsletter } from '@/modules/newsletter/container'
import { toFormState, type FormActionState } from '@/lib/forms/formActionState'
import { readHoneypot } from '@/lib/forms/honeypot'

/**
 * Alta en la newsletter desde el pin del feed (plan de `other`, fase 3). Vive
 * fuera de cualquier página porque la usa un componente del feed, no una
 * ruta concreta.
 */

export type NewsletterActionState = FormActionState & {
  message?: string

  /** true si es un alta nueva (cuenta para la analítica). */
  newSubscription?: boolean
}

export async function subscribeNewsletterAction(
  _previousState: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  const honeypot = readHoneypot(formData, 'company')

  const result = await subscribeToNewsletter(
    { email: formData.get('newsletterEmail') },
    honeypot,
  )

  if (!result.ok) return toFormState(result)

  // Cookie propia que marca este dispositivo como ya suscrito (alta nueva,
  // pendiente de confirmar o ya suscrito: los tres son «ya lo ha pedido»).
  // La escribe el servidor con `Set-Cookie` y NUNCA en el éxito silencioso
  // del honeypot, donde no ha pasado nada de verdad. No es `httpOnly`: la
  // lee el cliente para retirar las tarjetas que ya estén cargadas.
  if (!result.silent) {
    const store = await cookies()

    store.set(NEWSLETTER_COOKIE_NAME, NEWSLETTER_COOKIE_VALUE, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: NEWSLETTER_COOKIE_MAX_AGE_SECONDS,
    })
  }

  // UNA sola respuesta para los tres estados de Mailchimp (alta nueva,
  // pendiente de confirmar, ya suscrito): con textos distintos, cualquiera
  // podría averiguar si un email está en la lista, y además «pendiente»
  // decía «revisa tu bandeja» sin que llegara ningún correo nuevo. Lo que
  // ocurrió de verdad solo se usa para la analítica (`newSubscription`).
  return {
    success: true,
    newSubscription: result.newSubscription,
    message: NEWSLETTER_SUCCESS_MESSAGE,
  }
}

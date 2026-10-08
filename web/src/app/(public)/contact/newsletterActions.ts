'use server'

import { subscribeToNewsletter } from '@/modules/newsletter/application/subscribeToNewsletter'

export const NEWSLETTER_SUCCESS_MESSAGE =
  "Thanks! If this address isn't subscribed yet, we've sent you an email to confirm it. Check your inbox (and your spam folder)."

export type NewsletterActionState = {
  fieldErrors?: Record<string, string[]>
  formError?: string
  success?: boolean
  message?: string
  /** true si es un alta nueva (cuenta para la analítica). */
  newSubscription?: boolean
}

export async function subscribeNewsletterAction(
  _previousState: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  const honeypot = (formData.get('company') as string | null) ?? ''

  const result = await subscribeToNewsletter(
    { email: formData.get('newsletterEmail') },
    honeypot,
  )

  if (!result.ok) {
    if ('fieldErrors' in result) {
      return { fieldErrors: result.fieldErrors }
    }
    return { formError: result.formError }
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

import { fieldErrorsOf } from '@/lib/forms/formActionState'

import { UndeliverableEmailError } from '@/modules/newsletter/domain/newsletterErrors'
import type {
  AttemptLimiter,
  NewsletterSubscriber,
} from '@/modules/newsletter/domain/newsletterPorts'
import { newsletterSchema } from '@/modules/newsletter/domain/newsletterSchema'

/**
 * Límite por IP. 5/hora (el valor inicial) era demasiado bajo: varias
 * personas pueden compartir IP (la oficina, la wifi del stand en una feria) y,
 * si el proxy no manda `x-forwarded-for`, TODOS los visitantes comparten el
 * mismo hash (ver clientIp.ts). El límite solo tiene que frenar a quien
 * dispara el formulario en bucle, que además haría que Mailchimp mande
 * correos de confirmación a direcciones ajenas.
 */
export const NEWSLETTER_MAX_PER_WINDOW = 30
export const NEWSLETTER_WINDOW_MS = 60 * 60 * 1000

export type SubscribeNewsletterResult =
  | {
      ok: true
      status:
        'confirmation_sent' | 'already_subscribed' | 'confirmation_pending'
      /**
       * true solo cuando Mailchimp acaba de iniciar una confirmación de
       * verdad: es lo que cuenta como «alta» en analítica. El éxito silencioso
       * del honeypot lleva false para que un bot no engorde las cifras.
       */
      newSubscription: boolean
      /**
       * true solo en el éxito silencioso del honeypot: no ha pasado nada de
       * verdad, así que tampoco se marca el dispositivo con la cookie.
       */
      silent?: true
    }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; formError: string }

export function makeSubscribeToNewsletter({
  subscriber,
  limiter,
  visitorKey,
}: {
  subscriber: NewsletterSubscriber
  limiter: AttemptLimiter
  /** Clave del visitante para el límite (hash de su IP). */
  visitorKey: () => Promise<string>
}) {
  return async function subscribeToNewsletter(
    input: unknown,
    honeypot: string,
  ): Promise<SubscribeNewsletterResult> {
    // Bots que rellenan el honeypot reciben éxito silencioso para no darles
    // información sobre el filtro.
    if (honeypot.trim()) {
      return {
        ok: true,
        status: 'confirmation_sent',
        newSubscription: false,
        silent: true,
      }
    }

    const parsed = newsletterSchema.safeParse(input)

    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) }
    }

    if (!(await limiter.check(await visitorKey()))) {
      return {
        ok: false,
        formError: 'Too many attempts. Please try again later.',
      }
    }

    try {
      const result = await subscriber.subscribe(parsed.data.email)
      return {
        ok: true,
        status: result.status,
        newSubscription: result.status === 'confirmation_sent',
      }
    } catch (error) {
      console.error(error)
      return {
        ok: false,
        formError:
          error instanceof UndeliverableEmailError
            ? 'This email address cannot be subscribed. Please use another one.'
            : 'We could not subscribe you right now. Please try again later.',
      }
    }
  }
}

import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'
import { getHashedClientIp } from '@/lib/http/clientIp'
import { newsletterSchema } from '../domain/newsletterSchema'
import { subscribeEmailInMailchimp } from '../infrastructure/mailchimpNewsletter'
import { fieldErrorsOf } from '@/lib/forms/formActionState'

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

const newsletterLimiter = createFixedWindowRateLimiter({
  max: NEWSLETTER_MAX_PER_WINDOW,
  windowMs: NEWSLETTER_WINDOW_MS,
})

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
    }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; formError: string }

export async function subscribeToNewsletter(
  input: unknown,
  honeypot: string,
): Promise<SubscribeNewsletterResult> {
  // Bots que rellenan el honeypot reciben éxito silencioso para no darles
  // información sobre el filtro.
  if (honeypot.trim()) {
    return { ok: true, status: 'confirmation_sent', newSubscription: false }
  }

  const parsed = newsletterSchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) }
  }

  const visitorKey = await getHashedClientIp()
  if (!newsletterLimiter.check(visitorKey)) {
    return {
      ok: false,
      formError: 'Too many attempts. Please try again later.',
    }
  }

  try {
    const result = await subscribeEmailInMailchimp(parsed.data.email)
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
        error instanceof Error && error.message.includes('undeliverable')
          ? 'This email address cannot be subscribed. Please use another one.'
          : 'We could not subscribe you right now. Please try again later.',
    }
  }
}

import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'
import { getHashedClientIp } from '@/modules/contact/infrastructure/clientIp'
import { newsletterSchema } from '../domain/newsletterSchema'
import { subscribeEmailInMailchimp } from '../infrastructure/mailchimpNewsletter'

const newsletterLimiter = createFixedWindowRateLimiter({
  max: 5,
  windowMs: 60 * 60 * 1000,
})

export type SubscribeNewsletterResult =
  | {
      ok: true
      status:
        | 'confirmation_sent'
        | 'already_subscribed'
        | 'confirmation_pending'
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
    return { ok: true, status: 'confirmation_sent' }
  }

  const parsed = newsletterSchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
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
    return { ok: true, status: result.status }
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

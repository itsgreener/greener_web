import 'server-only'

import { getHashedClientIp } from '@/lib/http/clientIp'
import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'

import {
  NEWSLETTER_MAX_PER_WINDOW,
  NEWSLETTER_WINDOW_MS,
  makeSubscribeToNewsletter,
} from './application/subscribeToNewsletter'
import { mailchimpNewsletterSubscriber } from './infrastructure/mailchimpNewsletter'

/** Composition root de la newsletter. Ver `media/container.ts`. */

export const subscribeToNewsletter = makeSubscribeToNewsletter({
  subscriber: mailchimpNewsletterSubscriber,
  limiter: createFixedWindowRateLimiter({
    max: NEWSLETTER_MAX_PER_WINDOW,
    windowMs: NEWSLETTER_WINDOW_MS,
  }),
  visitorKey: getHashedClientIp,
})

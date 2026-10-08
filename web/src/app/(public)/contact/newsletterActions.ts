'use server'

import { subscribeToNewsletter } from '@/modules/newsletter/application/subscribeToNewsletter'

export type NewsletterActionState = {
  fieldErrors?: Record<string, string[]>
  formError?: string
  success?: boolean
  message?: string
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

  switch (result.status) {
    case 'already_subscribed':
      return {
        success: true,
        message: 'You are already subscribed to the Greener newsletter.',
      }
    case 'confirmation_pending':
      return {
        success: true,
        message:
          'Your subscription is waiting for confirmation. Check your inbox.',
      }
    default:
      return {
        success: true,
        message:
          'Check your inbox. We sent you an email to confirm your subscription.',
      }
  }
}

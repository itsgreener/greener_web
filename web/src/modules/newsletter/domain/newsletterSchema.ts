import { z } from 'zod'

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.')
    .max(254, 'Email is too long.'),
})

export type NewsletterInput = z.infer<typeof newsletterSchema>

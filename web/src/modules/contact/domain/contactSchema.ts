import { z } from 'zod'

/**
 * Formulario de contacto real (brief §5.6, arquitectura §14.1): "Debe
 * incluir consentimiento de privacidad, honeypot, límite por IP,
 * validación de email y registro mínimo de entrega/error en Supabase."
 * Este schema valida los campos que el usuario ve y rellena a mano; el
 * honeypot y el límite por IP se resuelven en la capa de aplicación
 * (submitContactForm.ts), no aquí — no son "datos del formulario" en el
 * sentido de algo que el usuario decide, son controles anti-spam.
 */
export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),

  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .max(40, "Phone can't be longer than 40 characters"),

  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email("Email isn't valid"),

  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(5000, "Message can't be longer than 5000 characters"),

  // "Debe incluir consentimiento de privacidad" (§14.1) — sin aceptar,
  // ni siquiera llega a validarse el resto.
  privacyConsent: z.literal(true, {
    message: 'You need to accept the privacy policy',
  }),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>

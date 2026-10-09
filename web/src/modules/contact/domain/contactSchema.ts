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
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(200),

  phone: z
    .string()
    .trim()
    .min(1, 'El teléfono es obligatorio')
    .max(40, 'El teléfono no puede superar los 40 caracteres'),

  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio')
    .email('El email no es válido'),

  message: z
    .string()
    .trim()
    .min(1, 'El mensaje es obligatorio')
    .max(5000, 'El mensaje no puede superar los 5000 caracteres'),

  // "Debe incluir consentimiento de privacidad" (§14.1) — sin aceptar,
  // ni siquiera llega a validarse el resto.
  privacyConsent: z.literal(true, {
    message: 'Tienes que aceptar la política de privacidad',
  }),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>

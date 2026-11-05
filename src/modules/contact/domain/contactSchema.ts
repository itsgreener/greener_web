import { z } from 'zod'

import { CONTACT_LIMITS } from './contactLimits'

/**
 * Formulario de contacto real (brief §5.6, arquitectura §14.1): honeypot,
 * límite por IP, validación de email y registro mínimo de entrega/error en
 * Supabase. El brief pedía además un consentimiento de privacidad; el texto
 * legal de /privacy (19 oct 2026) lo sustituye por una casilla meramente
 * informativa en el formulario («I have read the privacy policy»), que no es
 * un consentimiento, no es obligatoria y por eso no entra en este schema.
 * Este schema valida los campos que el usuario ve y rellena a mano; el
 * honeypot y el límite por IP se resuelven en la capa de aplicación
 * (submitContactForm.ts), no aquí — no son "datos del formulario" en el
 * sentido de algo que el usuario decide, son controles anti-spam.
 */

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(
      CONTACT_LIMITS.name,
      `Name can't be longer than ${CONTACT_LIMITS.name} characters`,
    ),

  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .max(
      CONTACT_LIMITS.phone,
      `Phone can't be longer than ${CONTACT_LIMITS.phone} characters`,
    ),

  // El máximo va antes que el formato: una dirección demasiado larga recibe
  // el aviso de longitud y no el genérico de «no válido».
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(
      CONTACT_LIMITS.email,
      `Email can't be longer than ${CONTACT_LIMITS.email} characters`,
    )
    .email("Email isn't valid"),

  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(
      CONTACT_LIMITS.message,
      `Message can't be longer than ${CONTACT_LIMITS.message} characters`,
    ),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>

import { contactFormSchema } from '../domain/contactSchema'
import { sendContactEmail } from '../infrastructure/mailer'
import { getHashedClientIp } from '../infrastructure/clientIp'
import {
  isRateLimited,
  logContactSubmission,
} from '../infrastructure/contactSubmissionLog'

export type SubmitContactFormResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; formError: string }

/**
 * Orquesta el envío del formulario de contacto (brief §5.6, arquitectura
 * §14.1): honeypot → límite por IP → validación → envío → registro.
 *
 * `honeypot` va aparte de `input` a propósito, no es un campo del
 * schema: es un control anti-spam, no un dato que el usuario decide
 * rellenar. Si viene relleno, se finge éxito sin validar ni enviar nada
 * — no hay que delatar al bot que se le ha detectado (§14.1).
 */
export async function submitContactForm(
  input: unknown,
  honeypot: string,
): Promise<SubmitContactFormResult> {
  if (honeypot.trim() !== '') {
    const ipHash = await getHashedClientIp()
    await logContactSubmission(ipHash, 'honeypot')
    return { ok: true }
  }

  const parsed = contactFormSchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const ipHash = await getHashedClientIp()

  if (await isRateLimited(ipHash)) {
    await logContactSubmission(ipHash, 'rate_limited')
    return {
      ok: false,
      formError:
        'Has enviado demasiados mensajes. Inténtalo de nuevo más tarde.',
    }
  }

  try {
    await sendContactEmail(parsed.data)
  } catch (error) {
    await logContactSubmission(
      ipHash,
      'failed',
      error instanceof Error ? error.message : 'Error desconocido',
    )
    return {
      ok: false,
      formError:
        'No se ha podido enviar el mensaje. Inténtalo de nuevo en unos minutos.',
    }
  }

  await logContactSubmission(ipHash, 'sent')

  return { ok: true }
}

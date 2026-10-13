import { fieldErrorsOf } from '@/lib/forms/formActionState'

import type {
  ContactMailer,
  ContactSubmissionLog,
} from '@/modules/contact/domain/contactPorts'
import { contactFormSchema } from '@/modules/contact/domain/contactSchema'

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
 *
 * `clientKey` devuelve el hash de la IP del visitante (nunca la IP en crudo).
 */
export function makeSubmitContactForm({
  mailer,
  log,
  clientKey,
}: {
  mailer: ContactMailer
  log: ContactSubmissionLog
  clientKey: () => Promise<string>
}) {
  return async function submitContactForm(
    input: unknown,
    honeypot: string,
  ): Promise<SubmitContactFormResult> {
    if (honeypot.trim() !== '') {
      await log.record(await clientKey(), 'honeypot')
      return { ok: true }
    }

    const parsed = contactFormSchema.safeParse(input)

    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) }
    }

    const ipHash = await clientKey()

    if (await log.isRateLimited(ipHash)) {
      await log.record(ipHash, 'rate_limited')
      return {
        ok: false,
        formError: 'You have sent too many messages. Please try again later.',
      }
    }

    try {
      await mailer.send(parsed.data)
    } catch (error) {
      await log.record(
        ipHash,
        'failed',
        error instanceof Error ? error.message : 'Error desconocido',
      )
      return {
        ok: false,
        formError:
          "We couldn't send your message. Please try again in a few minutes.",
      }
    }

    await log.record(ipHash, 'sent')

    return { ok: true }
  }
}

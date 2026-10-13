import type { ContactFormInput } from './contactSchema'

/** Entrega el mensaje del formulario al equipo. */
export interface ContactMailer {
  send(input: ContactFormInput): Promise<void>
}

export type ContactSubmissionStatus =
  'sent' | 'failed' | 'rate_limited' | 'honeypot'

/** Registro de envíos por IP (hash), para el límite y la trazabilidad. */
export interface ContactSubmissionLog {
  /** ¿Ha agotado esta IP su cupo de envíos? Si no se puede comprobar, true. */
  isRateLimited(ipHash: string): Promise<boolean>

  /** Anota un intento. Nunca lanza: que falle el registro no tumba el envío. */
  record(
    ipHash: string,
    status: ContactSubmissionStatus,
    error?: string,
  ): Promise<void>
}

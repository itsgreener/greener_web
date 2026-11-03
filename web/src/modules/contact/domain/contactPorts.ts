import type { ContactFormInput } from './contactSchema'

/** Entrega el mensaje del formulario al equipo. */
export interface ContactMailer {
  send(input: ContactFormInput): Promise<void>
}

export type ContactSubmissionStatus =
  'sent' | 'failed' | 'rate_limited' | 'honeypot'

/**
 * Resultado de comprobar el límite de envíos de una IP:
 * - `allowed`: puede enviar.
 * - `limited`: ha agotado su cupo.
 * - `unavailable`: no se ha podido comprobar (Supabase no responde). No se
 *   envía nada, igual que con `limited` (el formulario falla cerrado), pero
 *   el mensaje que ve la persona es otro: no ha hecho nada mal.
 */
export type RateLimitCheck = 'allowed' | 'limited' | 'unavailable'

/** Registro de envíos por IP (hash), para el límite y la trazabilidad. */
export interface ContactSubmissionLog {
  /** Nunca lanza: si no puede comprobarlo, devuelve `unavailable`. */
  checkRateLimit(ipHash: string): Promise<RateLimitCheck>

  /** Anota un intento. Nunca lanza: que falle el registro no tumba el envío. */
  record(
    ipHash: string,
    status: ContactSubmissionStatus,
    error?: string,
  ): Promise<void>
}

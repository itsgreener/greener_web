export type NewsletterSubscribeResult =
  | { status: 'confirmation_sent' }
  | { status: 'already_subscribed' }
  | { status: 'confirmation_pending' }

/** Alta en la lista de correo (doble opt-in). */
export interface NewsletterSubscriber {
  /** @throws UndeliverableEmailError si la dirección no se puede dar de alta */
  subscribe(email: string): Promise<NewsletterSubscribeResult>
}

/** Límite de intentos por visitante. */
export interface AttemptLimiter {
  /** true si el intento cabe en el cupo. Hay que esperarla: el cupo puede ser compartido. */
  check(key: string): boolean | Promise<boolean>
}

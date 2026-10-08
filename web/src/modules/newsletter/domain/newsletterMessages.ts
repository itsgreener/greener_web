/**
 * Mensaje ÚNICO de éxito de la newsletter. Vive aquí y no en
 * `newsletterActions.ts` porque un fichero `'use server'` solo puede
 * exportar funciones async (Next rompe la build con cualquier otra cosa).
 */
export const NEWSLETTER_SUCCESS_MESSAGE =
  "Thanks! If this address isn't subscribed yet, we've sent you an email to confirm it. Check your inbox (and your spam folder)."

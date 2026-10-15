/**
 * Cookie propia de la newsletter (plan de `other` §5): vale `1` cuando este
 * dispositivo ya se suscribió (alta nueva, pendiente de confirmar o ya
 * suscrito) y evita que el feed vuelva a intercalar el pin de newsletter.
 * No contiene email ni identificador. La escribe la Server Action de alta
 * (fase 3); el feed solo la lee, en el servidor.
 */
export const NEWSLETTER_COOKIE_NAME = 'greener_newsletter'

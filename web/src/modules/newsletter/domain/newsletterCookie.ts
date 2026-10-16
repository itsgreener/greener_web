/**
 * Cookie propia de la newsletter (plan de `other` §5): vale `1` cuando este
 * dispositivo ya se suscribió (alta nueva, pendiente de confirmar o ya
 * suscrito) y evita que el feed vuelva a intercalar el pin de newsletter.
 * No contiene email ni identificador. La escribe la Server Action de alta
 * (`app/_actions/newsletterActions.ts`) con `Set-Cookie`; el feed la lee en
 * el servidor y el cliente la lee para retirar las tarjetas ya cargadas.
 *
 * No es `httpOnly` a propósito (la lee el cliente) y no depende de la
 * ventana de cookies: es una preferencia que pide el propio visitante al
 * suscribirse (art. 22.2 LSSI). El criterio final es del asesor legal.
 */
export const NEWSLETTER_COOKIE_NAME = 'greener_newsletter'

export const NEWSLETTER_COOKIE_VALUE = '1'

/** 12 meses (decisión del 15 de octubre de 2026). */
export const NEWSLETTER_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

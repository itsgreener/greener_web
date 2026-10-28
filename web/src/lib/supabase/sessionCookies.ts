import type { CookieOptions } from '@supabase/ssr'

/**
 * Cookies de sesión del ABM (auditoría de seguridad del 23 oct, SEC-X-1).
 *
 * `@supabase/ssr` las crea por defecto con `httpOnly: false` y 400 días de
 * vida. Aquí las endurecemos en los dos puntos donde el servidor las escribe
 * (`lib/supabase/server.ts` y `lib/supabase/proxy.ts`):
 *
 * - `httpOnly`: el navegador no las necesita (el único cliente de navegador
 *   es el del login, que solo lanza el OAuth), y así un script que corra en el
 *   origen del sitio (un paquete de tool o insight comprometido, ver SEC-X-1)
 *   no puede leer los tokens.
 * - Vida máxima de 7 días, renovable: el proxy reescribe las cookies cuando
 *   refresca el token, así que quien usa el ABM no nota nada y una sesión
 *   abandonada caduca sola.
 * - `secure` en producción.
 *
 * La cookie del verificador PKCE la crea el navegador (`createBrowserClient`)
 * con sus propias opciones: no pasa por aquí.
 */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function hardenSessionCookie(
  options: CookieOptions = {},
): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? true : options.secure,
    // `Math.min` y no una asignación: al cerrar sesión Supabase borra las
    // cookies con `maxAge: 0`, y eso no se puede pisar.
    maxAge: Math.min(
      options.maxAge ?? SESSION_COOKIE_MAX_AGE_SECONDS,
      SESSION_COOKIE_MAX_AGE_SECONDS,
    ),
  }
}

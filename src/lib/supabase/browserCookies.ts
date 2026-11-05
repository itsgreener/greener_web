import type { CookieOptions } from '@supabase/ssr'

/**
 * Cookies que escribe el cliente de navegador del login (SEC-X-1a).
 *
 * El inicio de sesión con Google usa PKCE: antes de redirigir, el navegador
 * guarda en cookies el verificador del código (`…-code-verifier`,
 * `…-flows-code-verifier` y `…-flow-<id>`). Las crea JavaScript, así que no
 * pueden ser `HttpOnly`, y `@supabase/ssr` las deja 400 días y sin `Secure`
 * (la opción `cookieOptions.maxAge` la ignora a propósito). Por sí solas no
 * dan acceso a nada, porque hace falta además el código de un solo uso que
 * devuelve Google, pero tampoco hay motivo para que sobrevivan a un intento
 * de login: el viaje de ida y vuelta a Google dura segundos.
 *
 * Por eso el cliente usa este adaptador de `document.cookie`:
 *
 * - las cookies del flujo PKCE viven como máximo 10 minutos;
 * - todas llevan `Secure` cuando la página va por HTTPS.
 *
 * Las cookies de sesión (`…-auth-token`) no pasan por aquí: las escribe el
 * servidor, ya `HttpOnly` y con 7 días (`sessionCookies.ts`).
 */
export const PKCE_COOKIE_MAX_AGE_SECONDS = 10 * 60

type NameValue = { name: string; value: string }

type CookieToSet = NameValue & { options: CookieOptions }

/** ¿Es una cookie del flujo PKCE (verificador, índice de flujos o flujo en curso)? */
export function isPkceFlowCookie(name: string): boolean {
  return (
    name.endsWith('-code-verifier') || /-flow-[A-Za-z0-9_-]{8,64}$/.test(name)
  )
}

/**
 * Opciones definitivas de una cookie del navegador. El borrado
 * (`maxAge: 0`) no se toca: ya es el más corto posible.
 */
export function hardenBrowserCookie(
  name: string,
  options: CookieOptions = {},
  isSecureContext: boolean,
): CookieOptions {
  const hardened: CookieOptions = {
    ...options,
    secure: isSecureContext ? true : options.secure,
  }

  if (isPkceFlowCookie(name)) {
    hardened.maxAge = Math.min(
      options.maxAge ?? PKCE_COOKIE_MAX_AGE_SECONDS,
      PKCE_COOKIE_MAX_AGE_SECONDS,
    )
  }

  return hardened
}

function sameSiteToken(value: CookieOptions['sameSite']): string | null {
  if (value === true) return 'Strict'
  if (typeof value !== 'string') return null

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

/** `Set-Cookie` para `document.cookie`: valor codificado, sin `HttpOnly` (JavaScript no puede crearla). */
export function serializeBrowserCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`)
  }

  if (options.domain) parts.push(`Domain=${options.domain}`)

  parts.push(`Path=${options.path ?? '/'}`)

  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`)

  const sameSite = sameSiteToken(options.sameSite)

  if (sameSite) parts.push(`SameSite=${sameSite}`)

  if (options.secure) parts.push('Secure')

  return parts.join('; ')
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function parseBrowserCookies(header: string): NameValue[] {
  return header
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .flatMap((pair) => {
      const separator = pair.indexOf('=')

      if (separator <= 0) return []

      return [
        {
          name: pair.slice(0, separator),
          value: safeDecode(pair.slice(separator + 1)),
        },
      ]
    })
}

/** `getAll`/`setAll` de `createBrowserClient` sobre `document.cookie`. */
export function createBrowserCookieAdapter() {
  return {
    getAll(): NameValue[] {
      if (typeof document === 'undefined') return []

      return parseBrowserCookies(document.cookie)
    },

    setAll(cookies: CookieToSet[]): void {
      if (typeof document === 'undefined') return

      const isSecureContext = window.location.protocol === 'https:'

      for (const { name, value, options } of cookies) {
        document.cookie = serializeBrowserCookie(
          name,
          value,
          hardenBrowserCookie(name, options, isSecureContext),
        )
      }
    },
  }
}

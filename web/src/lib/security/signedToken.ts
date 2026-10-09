import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '@/lib/env'

/**
 * Tokens firmados con HMAC-SHA256: `<payload JSON en base64url>.<firma>`.
 * Lo comparten el cursor del feed y el link de preview (antes eran dos
 * copias del mismo código, auditoría 8 oct).
 *
 * La clave es `APP_SIGNING_SECRET` si existe; si no, `SUPABASE_SECRET_KEY`,
 * que es lo que se usaba hasta ahora: sin la variable nueva, los cursores y
 * links de preview ya emitidos siguen siendo válidos. Cada consumidor valida
 * la FORMA de su payload, así que un cursor no sirve como preview ni al revés.
 */

function signingKey(): string {
  return env.APP_SIGNING_SECRET ?? env.SUPABASE_SECRET_KEY
}

function sign(body: string): string {
  return createHmac('sha256', signingKey()).update(body).digest('base64url')
}

export function encodeSignedToken(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf-8').toString(
    'base64url',
  )
  return `${body}.${sign(body)}`
}

/** El payload si la firma es válida; null si el token es ajeno o corrupto. */
export function decodeSignedToken(token: string): unknown | null {
  const [body, signature, ...rest] = token.split('.')
  if (!body || !signature || rest.length > 0) return null

  // timingSafeEqual exige el mismo tamaño o lanza: se comprueba antes.
  const expected = Buffer.from(sign(body))
  const received = Buffer.from(signature)
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}

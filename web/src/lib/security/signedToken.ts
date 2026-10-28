import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '@/lib/env'
import { getSigningEnv } from '@/lib/serverEnv'

/**
 * Tokens firmados con HMAC-SHA256: `<payload JSON en base64url>.<firma>`.
 * Lo comparten el cursor del feed y el link de preview.
 *
 * La clave es `APP_SIGNING_SECRET`. En producción es obligatoria (la valida
 * `getSigningEnv`): la clave que salta RLS no debe firmar además tokens que
 * viajan en URLs. Fuera de producción, si no está, se usa `SUPABASE_SECRET_KEY`
 * para no obligar a configurarla en local.
 *
 * La firma cubre también el PROPÓSITO (`cursor`, `preview`): un token firmado
 * para una cosa no vale para otra aunque algún día los payloads coincidan.
 * Además, cada consumidor valida la forma de su payload.
 */
export type SignedTokenPurpose = 'cursor' | 'preview'

function signingKey(): string {
  return getSigningEnv().APP_SIGNING_SECRET ?? env.SUPABASE_SECRET_KEY
}

function sign(purpose: SignedTokenPurpose, body: string): string {
  return createHmac('sha256', signingKey())
    .update(`${purpose}:${body}`)
    .digest('base64url')
}

export function encodeSignedToken(
  purpose: SignedTokenPurpose,
  payload: unknown,
): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf-8').toString(
    'base64url',
  )
  return `${body}.${sign(purpose, body)}`
}

/** El payload si la firma es válida; null si el token es ajeno o corrupto. */
export function decodeSignedToken(
  purpose: SignedTokenPurpose,
  token: string,
): unknown | null {
  const [body, signature, ...rest] = token.split('.')
  if (!body || !signature || rest.length > 0) return null

  // timingSafeEqual exige el mismo tamaño o lanza: se comprueba antes.
  const expected = Buffer.from(sign(purpose, body))
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

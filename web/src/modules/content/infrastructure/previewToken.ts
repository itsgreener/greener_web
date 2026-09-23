import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'

/**
 * Token de preview firmado (arquitectura §15.3: "URL firmada, con
 * expiración... visible solo con token"). Mismo mecanismo que el cursor
 * del feed (`modules/feed/infrastructure/cursor.ts`): HMAC-SHA256 con
 * `SUPABASE_SECRET_KEY`, payload en base64url + firma.
 *
 * Autocontenido y sin estado a propósito: el propio token lleva firmados
 * `contentId` y `expiresAt`, no hay tabla ni migración nueva que
 * mantener. La contrapartida es que no se puede revocar un token antes
 * de que caduque — solo esperar. Decisión de sesión de trabajo: 7 días
 * de vigencia, suficiente para una revisión con idas y vueltas sin tener
 * que regenerar el link a medias.
 *
 * El preview es para revisar contenido *antes* de que pase por primera
 * vez a `published` — no hay concepto de "borrador sobre lo publicado"
 * (arquitectura §19.1: "no habrá staging persistente de contenido").
 */
const PREVIEW_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface PreviewTokenPayload {
  contentId: string
  expiresAt: number
}

function sign(payload: string): string {
  return createHmac('sha256', env.SUPABASE_SECRET_KEY)
    .update(payload)
    .digest('base64url')
}

export function encodePreviewToken(contentId: string): string {
  const payload: PreviewTokenPayload = {
    contentId,
    expiresAt: Date.now() + PREVIEW_TOKEN_TTL_MS,
  }
  const json = JSON.stringify(payload)
  const body = Buffer.from(json, 'utf-8').toString('base64url')
  const signature = sign(body)
  return `${body}.${signature}`
}

/**
 * Devuelve el `contentId` si el token es válido, no ha caducado y
 * corresponde al contenido cuyo slug se está pidiendo; null en
 * cualquier otro caso (token ajeno, corrupto o caducado). El único
 * comprobador de la coincidencia contentId/slug es quien llama a esta
 * función — decodificar el token no es suficiente por sí solo, ver
 * `getPreviewableContentBySlug`.
 */
export function decodePreviewToken(token: string): string | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = sign(body)

  // Evita timing attacks comparando la firma; ambos buffers deben tener
  // el mismo tamaño o timingSafeEqual lanza en vez de devolver false.
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  if (
    expectedBuf.length !== signatureBuf.length ||
    !timingSafeEqual(expectedBuf, signatureBuf)
  ) {
    return null
  }

  try {
    const json = Buffer.from(body, 'base64url').toString('utf-8')
    const parsed = JSON.parse(json) as PreviewTokenPayload
    if (
      typeof parsed.contentId !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null
    }
    if (Date.now() >= parsed.expiresAt) return null
    return parsed.contentId
  } catch {
    return null
  }
}

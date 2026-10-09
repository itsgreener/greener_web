import {
  decodeSignedToken,
  encodeSignedToken,
} from '@/lib/security/signedToken'

/**
 * Token de preview firmado (arquitectura §15.3: "URL firmada, con
 * expiración... visible solo con token"). Mismo mecanismo que el cursor
 * del feed: `lib/security/signedToken.ts` (HMAC-SHA256, payload en
 * base64url + firma).
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

export function encodePreviewToken(contentId: string): string {
  const payload: PreviewTokenPayload = {
    contentId,
    expiresAt: Date.now() + PREVIEW_TOKEN_TTL_MS,
  }
  return encodeSignedToken(payload)
}

/**
 * Devuelve el `contentId` si el token es válido y no ha caducado; null en
 * cualquier otro caso (token ajeno, corrupto o caducado). Decodificar el
 * token no basta: quien llama comprueba además que ese `contentId` es el del
 * slug pedido (ver `resolvePreviewContext`).
 */
export function decodePreviewToken(token: string): string | null {
  const parsed = decodeSignedToken(token) as Partial<PreviewTokenPayload> | null

  if (
    !parsed ||
    typeof parsed.contentId !== 'string' ||
    typeof parsed.expiresAt !== 'number'
  ) {
    return null
  }

  if (Date.now() >= parsed.expiresAt) return null

  return parsed.contentId
}

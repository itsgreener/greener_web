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
 * Autocontenido y sin estado: el propio token lleva firmados `contentId`,
 * `issuedAt` y `expiresAt`. Vigencia corta, 24 horas (decidido el 27 oct 2026;
 * antes eran 7 días, SEC-ADM-D2): cubre una revisión en el día; si hace falta
 * más, se genera otro enlace.
 *
 * Revocar un enlace antes de que caduque (29 oct 2026) no se guarda en el
 * token sino en el contenido (`content.preview_revoked_at`): el enlace solo
 * vale si `issuedAt` es posterior. Ver `previewRevocations.ts`.
 *
 * El preview es para revisar contenido *antes* de que pase por primera
 * vez a `published` — no hay concepto de "borrador sobre lo publicado"
 * (arquitectura §19.1: "no habrá staging persistente de contenido").
 */
export const PREVIEW_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export interface PreviewTokenPayload {
  contentId: string
  /** Cuándo se generó el enlace (ms); lo compara la revocación. */
  issuedAt: number
  expiresAt: number
}

export function encodePreviewToken(contentId: string): string {
  const issuedAt = Date.now()
  const payload: PreviewTokenPayload = {
    contentId,
    issuedAt,
    expiresAt: issuedAt + PREVIEW_TOKEN_TTL_MS,
  }
  return encodeSignedToken('preview', payload)
}

/**
 * Devuelve el `contentId` y la fecha de emisión si el token es válido y no ha
 * caducado; null en cualquier otro caso (token ajeno, corrupto, caducado o de
 * antes de que el token llevara fecha de emisión). Decodificar el token no
 * basta: quien llama comprueba además que ese `contentId` es el del slug
 * pedido y que no está revocado (ver `resolvePreviewContext`).
 */
export function decodePreviewToken(
  token: string,
): { contentId: string; issuedAt: number } | null {
  const parsed = decodeSignedToken(
    'preview',
    token,
  ) as Partial<PreviewTokenPayload> | null

  if (
    !parsed ||
    typeof parsed.contentId !== 'string' ||
    typeof parsed.issuedAt !== 'number' ||
    typeof parsed.expiresAt !== 'number'
  ) {
    return null
  }

  if (Date.now() >= parsed.expiresAt) return null

  return { contentId: parsed.contentId, issuedAt: parsed.issuedAt }
}

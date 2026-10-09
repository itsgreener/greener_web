import {
  decodeSignedToken,
  encodeSignedToken,
} from '@/lib/security/signedToken'

/**
 * Cursor opaco y firmado (arquitectura §8.5): "el cliente no puede alterar
 * cuotas ni seed". El cursor solo lleva sessionId + roundIndex — nunca la
 * seed ni las cuotas, que siempre se leen del lado servidor desde
 * feed_session. La firma HMAC evita que alguien fabrique un cursor válido
 * apuntando a otra sesión o a un roundIndex arbitrario sin pasar por la API.
 */
export interface FeedCursorPayload {
  sessionId: string
  roundIndex: number
}

export function encodeCursor(payload: FeedCursorPayload): string {
  return encodeSignedToken(payload)
}

/** Devuelve el payload si la firma es válida; null si el cursor es inválido, ajeno o corrupto. */
export function decodeCursor(cursor: string): FeedCursorPayload | null {
  const parsed = decodeSignedToken(cursor) as Partial<FeedCursorPayload> | null

  if (
    !parsed ||
    typeof parsed.sessionId !== 'string' ||
    typeof parsed.roundIndex !== 'number' ||
    !Number.isInteger(parsed.roundIndex) ||
    parsed.roundIndex < 0
  ) {
    return null
  }

  return { sessionId: parsed.sessionId, roundIndex: parsed.roundIndex }
}

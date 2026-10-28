import {
  decodeSignedToken,
  encodeSignedToken,
} from '@/lib/security/signedToken'

import type {
  FeedCursorCodec,
  FeedCursorPayload,
} from '@/modules/feed/domain/feedPorts'

/**
 * Cursor opaco y firmado (arquitectura §8.5): "el cliente no puede alterar
 * cuotas ni seed". El cursor solo lleva sessionId + roundIndex + offset
 * (por dónde va dentro de la ronda) y `served` (pines de ronda servidos en
 * la sesión, base del calendario de interludios) — nunca la
 * seed ni las cuotas, que siempre se leen del lado servidor desde
 * feed_session. La firma HMAC evita que alguien fabrique un cursor válido
 * apuntando a otra sesión o a un roundIndex arbitrario sin pasar por la API.
 */
export function encodeCursor(payload: FeedCursorPayload): string {
  return encodeSignedToken('cursor', payload)
}

/** Devuelve el payload si la firma es válida; null si el cursor es inválido, ajeno o corrupto. */
export function decodeCursor(cursor: string): FeedCursorPayload | null {
  const parsed = decodeSignedToken(
    'cursor',
    cursor,
  ) as Partial<FeedCursorPayload> | null
  // Los cursores anteriores a servir la ronda por tramos no llevan offset:
  // equivalen a «principio de esa ronda».
  const offset = parsed?.offset ?? 0
  // Los anteriores a los interludios no llevan `served`: se leen como 0.
  const served = parsed?.served ?? 0

  if (
    !parsed ||
    typeof parsed.sessionId !== 'string' ||
    typeof parsed.roundIndex !== 'number' ||
    !Number.isInteger(parsed.roundIndex) ||
    parsed.roundIndex < 0 ||
    typeof offset !== 'number' ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    typeof served !== 'number' ||
    !Number.isInteger(served) ||
    served < 0
  ) {
    return null
  }

  return {
    sessionId: parsed.sessionId,
    roundIndex: parsed.roundIndex,
    offset,
    served,
  }
}

export const signedFeedCursor: FeedCursorCodec = {
  encode: encodeCursor,
  decode: decodeCursor,
}

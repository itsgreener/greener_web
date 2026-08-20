import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Cursor opaco y firmado (arquitectura §8.5): "el cliente no puede alterar
 * cuotas ni seed". El cursor solo lleva sessionId + roundIndex — nunca la
 * seed ni las cuotas, que siempre se leen del lado servidor desde
 * feed_session. La firma HMAC evita que alguien fabrique un cursor válido
 * apuntando a otra sesión o a un roundIndex arbitrario sin pasar por la API.
 */
export interface FeedCursorPayload {
  sessionId: string;
  roundIndex: number;
}

function sign(payload: string): string {
  return createHmac("sha256", env.SUPABASE_SECRET_KEY).update(payload).digest("base64url");
}

export function encodeCursor(payload: FeedCursorPayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, "utf-8").toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

/** Devuelve el payload si la firma es válida; null si el cursor es inválido, ajeno o corrupto. */
export function decodeCursor(cursor: string): FeedCursorPayload | null {
  const [body, signature] = cursor.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);

  // Evita timing attacks comparando la firma; ambos buffers deben tener
  // el mismo tamaño o timingSafeEqual lanza en vez de devolver false.
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) {
    return null;
  }

  try {
    const json = Buffer.from(body, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as FeedCursorPayload;
    if (typeof parsed.sessionId !== "string" || typeof parsed.roundIndex !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

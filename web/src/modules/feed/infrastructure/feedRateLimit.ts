import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'

/**
 * Límites del feed público (POST /api/feed/sessions, GET
 * /api/feed/{sessionId} — §16.1), decididos el 29 de septiembre
 * (PROGRESO §2.16) tras valorar el coste real de cada uno: crear una
 * sesión es una fila; pedir un lote genera una ronda completa (el
 * algoritmo de cuotas y mezcla contra todo el catálogo, §8), así que
 * merece más margen — una persona haciendo scroll rápido puede pedir
 * varios lotes por minuto sin hacer nada indebido.
 */
const SESSION_CREATION_LIMIT = { max: 12, windowMs: 60_000 }
const BATCH_FETCH_LIMIT = { max: 50, windowMs: 60_000 }

const sessionCreationLimiter = createFixedWindowRateLimiter(
  SESSION_CREATION_LIMIT,
)
const batchFetchLimiter = createFixedWindowRateLimiter(BATCH_FETCH_LIMIT)

export function canCreateSession(visitorId: string): boolean {
  return sessionCreationLimiter.check(visitorId)
}

export function canFetchBatch(visitorId: string): boolean {
  return batchFetchLimiter.check(visitorId)
}

// Sesión más reciente de cada visitante — solo para poder devolverla en
// vez de crear una nueva cuando se supera SESSION_CREATION_LIMIT (§2.16:
// "repetir la sesión más reciente es razonable"). Efecto secundario
// asumido a propósito: si eso ocurre, esa recarga muestra la misma
// secuencia que la anterior, en vez de una nueva (arquitectura §1, "home
// distinta en cada carga completa") — solo le pasa a quien supera 12
// creaciones de sesión en un minuto, muy por encima del uso normal.
//
// TTL propio de 24h (igual que la cookie y que feed_session), con purga
// perezosa igual que el limitador: sin esto, cada visitante nuevo deja
// una entrada que nunca se borraría sola.
const SESSION_MEMORY_TTL_MS = 60 * 60 * 24 * 1000
const SWEEP_EVERY_CALLS = 1000

const lastSessionByVisitor = new Map<
  string,
  { sessionId: string; rememberedAt: number }
>()
let callsSinceSweep = 0

function sweepExpiredSessions(now: number): void {
  for (const [visitorId, entry] of lastSessionByVisitor) {
    if (now - entry.rememberedAt >= SESSION_MEMORY_TTL_MS) {
      lastSessionByVisitor.delete(visitorId)
    }
  }
}

export function rememberSession(visitorId: string, sessionId: string): void {
  const now = Date.now()

  callsSinceSweep += 1
  if (callsSinceSweep >= SWEEP_EVERY_CALLS) {
    callsSinceSweep = 0
    sweepExpiredSessions(now)
  }

  lastSessionByVisitor.set(visitorId, { sessionId, rememberedAt: now })
}

export function getLastSession(visitorId: string): string | null {
  const entry = lastSessionByVisitor.get(visitorId)

  if (!entry) {
    return null
  }

  if (Date.now() - entry.rememberedAt >= SESSION_MEMORY_TTL_MS) {
    lastSessionByVisitor.delete(visitorId)
    return null
  }

  return entry.sessionId
}

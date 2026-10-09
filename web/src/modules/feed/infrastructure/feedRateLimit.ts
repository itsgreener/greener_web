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

// Sesión más reciente de cada visitante Y scope. Es importante no reutilizar
// una sesión de `home` al pedir `tools`, ni una de `channel` al pedir
// `insights`: si el visitante alcanza el límite, el fallback debe conservar
// exactamente el universo solicitado.
//
// TTL propio de 24h (igual que la cookie y que feed_session), con purga
// perezosa igual que el limitador.
const SESSION_MEMORY_TTL_MS = 60 * 60 * 24 * 1000
const SWEEP_EVERY_CALLS = 1000

const lastSessionByVisitorAndScope = new Map<
  string,
  { sessionId: string; rememberedAt: number }
>()
let callsSinceSweep = 0

function memoryKey(visitorId: string, scope: string): string {
  return `${visitorId}::${scope}`
}

function sweepExpiredSessions(now: number): void {
  for (const [key, entry] of lastSessionByVisitorAndScope) {
    if (now - entry.rememberedAt >= SESSION_MEMORY_TTL_MS) {
      lastSessionByVisitorAndScope.delete(key)
    }
  }
}

/**
 * `scope` queda al final y con default 'home' para mantener compatibilidad
 * con los tests/llamadas antiguas de dos argumentos.
 */
export function rememberSession(
  visitorId: string,
  sessionId: string,
  scope: string = 'home',
): void {
  const now = Date.now()

  callsSinceSweep += 1
  if (callsSinceSweep >= SWEEP_EVERY_CALLS) {
    callsSinceSweep = 0
    sweepExpiredSessions(now)
  }

  lastSessionByVisitorAndScope.set(memoryKey(visitorId, scope), {
    sessionId,
    rememberedAt: now,
  })
}

export function getLastSession(
  visitorId: string,
  scope: string = 'home',
): string | null {
  const key = memoryKey(visitorId, scope)
  const entry = lastSessionByVisitorAndScope.get(key)

  if (!entry) {
    return null
  }

  if (Date.now() - entry.rememberedAt >= SESSION_MEMORY_TTL_MS) {
    lastSessionByVisitorAndScope.delete(key)
    return null
  }

  return entry.sessionId
}

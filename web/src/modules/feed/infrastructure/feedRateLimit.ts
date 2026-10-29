import { runRedis } from '@/lib/rateLimit/upstashRest'
import {
  createSharedRateLimiter,
  sharedStoreKey,
} from '@/lib/rateLimit/sharedRateLimiter'
import { isRateLimitStoreConfigured } from '@/lib/serverEnv'

import type { FeedRequestLimits } from '@/modules/feed/domain/feedPorts'
import type { FeedScope } from '@/modules/feed/domain/feedScope'

/**
 * Límites del feed público (POST /api/feed/sessions, GET
 * /api/feed/{sessionId} — §16.1; PROGRESO §2.16), según el coste real de
 * cada uno: crear una sesión es una fila; pedir un lote genera una ronda completa (el
 * algoritmo de cuotas y mezcla contra todo el catálogo, §8), así que
 * merece más margen — una persona haciendo scroll rápido puede pedir
 * varios lotes por minuto sin hacer nada indebido.
 *
 * Cada límite se cuenta dos veces: por visitante (cookie) y por IP. La cookie
 * la controla quien hace la petición, así que rotarla esquivaba el límite por
 * completo (SEC-PUB-A2); la IP se cuenta con un cupo mayor porque tras una
 * misma IP pueden estar varias personas (oficina, red móvil con NAT). Los
 * contadores viven en un almacén compartido si está configurado (Upstash,
 * SEC-PUB-A1) y, si no, en memoria de la instancia.
 */
const SESSION_CREATION_LIMIT = { max: 12, windowMs: 60_000 }
const BATCH_FETCH_LIMIT = { max: 50, windowMs: 60_000 }
const SESSION_CREATION_BY_IP_LIMIT = { max: 60, windowMs: 60_000 }
const BATCH_FETCH_BY_IP_LIMIT = { max: 300, windowMs: 60_000 }

const sessionCreationLimiter = createSharedRateLimiter({
  name: 'feed-session',
  ...SESSION_CREATION_LIMIT,
})
const batchFetchLimiter = createSharedRateLimiter({
  name: 'feed-batch',
  ...BATCH_FETCH_LIMIT,
})
const sessionCreationByIpLimiter = createSharedRateLimiter({
  name: 'feed-session-ip',
  ...SESSION_CREATION_BY_IP_LIMIT,
})
const batchFetchByIpLimiter = createSharedRateLimiter({
  name: 'feed-batch-ip',
  ...BATCH_FETCH_BY_IP_LIMIT,
})

export async function canCreateSession(
  visitorId: string,
  ip?: string | null,
): Promise<boolean> {
  const byVisitor = await sessionCreationLimiter.check(visitorId)
  const byIp = await sessionCreationByIpLimiter.check(ip ?? 'unknown')

  return byVisitor && byIp
}

export async function canFetchBatch(
  visitorId: string,
  ip?: string | null,
): Promise<boolean> {
  const byVisitor = await batchFetchLimiter.check(visitorId)
  const byIp = await batchFetchByIpLimiter.check(ip ?? 'unknown')

  return byVisitor && byIp
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
// Tope duro de entradas: con cookies o IPs rotatorias el mapa no puede crecer
// sin límite entre purgas (SEC-PUB-A1). Al llegar, se descarta la más antigua.
const MAX_REMEMBERED_SESSIONS = 10_000

const lastSessionByVisitorAndScope = new Map<
  string,
  { sessionId: string; rememberedAt: number }
>()
let callsSinceSweep = 0

function memoryKey(visitorId: string, scope: FeedScope): string {
  return `${visitorId}::${scope}`
}

function sweepExpiredSessions(now: number): void {
  for (const [key, entry] of lastSessionByVisitorAndScope) {
    if (now - entry.rememberedAt >= SESSION_MEMORY_TTL_MS) {
      lastSessionByVisitorAndScope.delete(key)
    }
  }
}

function rememberSessionLocally(
  visitorId: string,
  sessionId: string,
  scope: FeedScope,
): void {
  const now = Date.now()

  callsSinceSweep += 1
  if (callsSinceSweep >= SWEEP_EVERY_CALLS) {
    callsSinceSweep = 0
    sweepExpiredSessions(now)
  }

  if (lastSessionByVisitorAndScope.size >= MAX_REMEMBERED_SESSIONS) {
    const oldest = lastSessionByVisitorAndScope.keys().next().value

    if (oldest !== undefined) lastSessionByVisitorAndScope.delete(oldest)
  }

  const key = memoryKey(visitorId, scope)

  // Reinsertar mueve la clave al final: el orden del mapa es el de recencia.
  lastSessionByVisitorAndScope.delete(key)
  lastSessionByVisitorAndScope.set(key, {
    sessionId,
    rememberedAt: now,
  })
}

function getLastSessionLocally(
  visitorId: string,
  scope: FeedScope,
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

const SESSION_MEMORY_TTL_SECONDS = SESSION_MEMORY_TTL_MS / 1000

function sessionStoreKey(visitorId: string, scope: FeedScope): string {
  return sharedStoreKey('feed-last-session', memoryKey(visitorId, scope))
}

/**
 * Recuerda la sesión más reciente. Con almacén compartido se guarda ahí (sin
 * él, la «sesión de repuesto» de un visitante solo existiría en la instancia
 * que la creó); siempre queda también en memoria como respaldo.
 */
export async function rememberSession(
  visitorId: string,
  sessionId: string,
  scope: FeedScope,
): Promise<void> {
  rememberSessionLocally(visitorId, sessionId, scope)

  if (!isRateLimitStoreConfigured()) return

  try {
    await runRedis([
      [
        'SET',
        sessionStoreKey(visitorId, scope),
        sessionId,
        'EX',
        SESSION_MEMORY_TTL_SECONDS,
      ],
    ])
  } catch (error) {
    console.error('Feed · no se pudo recordar la sesión en el almacén:', error)
  }
}

export async function getLastSession(
  visitorId: string,
  scope: FeedScope,
): Promise<string | null> {
  if (isRateLimitStoreConfigured()) {
    try {
      const [stored] = await runRedis([
        ['GET', sessionStoreKey(visitorId, scope)],
      ])

      if (typeof stored === 'string' && stored.length > 0) return stored
    } catch (error) {
      console.error('Feed · no se pudo leer la sesión del almacén:', error)
    }
  }

  return getLastSessionLocally(visitorId, scope)
}

export const inMemoryFeedRequestLimits: FeedRequestLimits = {
  canCreateSession,
  canFetchBatch,
  rememberSession,
  getLastSession,
}

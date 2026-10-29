import { createHash } from 'node:crypto'

import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'
import { runRedis } from '@/lib/rateLimit/upstashRest'
import { getIpHashEnv, isRateLimitStoreConfigured } from '@/lib/serverEnv'

/** Un limitador cuya respuesta puede ser asíncrona (almacén compartido). */
export interface RateLimiter {
  /** true = permitida (y ya cuenta); false = supera el límite. Hay que esperarla con `await`. */
  check(key: string): boolean | Promise<boolean>
}

const REPORT_EVERY_MS = 60_000
let lastReportAt = 0

function reportStoreFailure(error: unknown): void {
  const now = Date.now()

  if (now - lastReportAt < REPORT_EVERY_MS) return

  lastReportAt = now
  console.error(
    'Límites · el almacén compartido falla; se usa el límite en memoria:',
    error,
  )
}

/**
 * La clave que llega al almacén no lleva el dato en claro: una IP, un email o
 * el token personal de un candidato no deben vivir en un servicio de terceros.
 * Se firma con la misma sal que ya protege el hash de la IP.
 */
export function sharedStoreKey(name: string, key: string): string {
  const digest = createHash('sha256')
    .update(`${getIpHashEnv().CONTACT_IP_HASH_SALT}:${name}:${key}`)
    .digest('hex')

  return `rl:${name}:${digest}`
}

/**
 * Limitador de ventana fija con contador COMPARTIDO entre instancias (Upstash
 * Redis por REST): `INCR` y `PEXPIRE … NX` en una transacción, de modo que la
 * ventana empieza en la primera petición y no se prolonga con las siguientes
 * (mismo criterio que el limitador en memoria).
 *
 * Es un amortiguador, no una barrera: si el almacén no está configurado o
 * falla, se cae al limitador en memoria de la instancia en vez de bloquear a
 * nadie ni dejar pasar todo. Con el almacén caído el comportamiento es el de
 * antes de existir (cada instancia cuenta lo suyo).
 */
export function createSharedRateLimiter(options: {
  /** Nombre del límite; forma parte de la clave. */
  name: string
  max: number
  windowMs: number
}): RateLimiter {
  const local = createFixedWindowRateLimiter({
    max: options.max,
    windowMs: options.windowMs,
  })

  return {
    async check(key: string): Promise<boolean> {
      if (!isRateLimitStoreConfigured()) return local.check(key)

      try {
        const redisKey = sharedStoreKey(options.name, key)

        const [count] = await runRedis(
          [
            ['INCR', redisKey],
            ['PEXPIRE', redisKey, options.windowMs, 'NX'],
          ],
          'multi-exec',
        )

        if (typeof count !== 'number') {
          throw new Error('El contador del almacén no es un número.')
        }

        return count <= options.max
      } catch (error) {
        reportStoreFailure(error)

        return local.check(key)
      }
    },
  }
}

import { getRateLimitStoreEnv } from '@/lib/serverEnv'

/**
 * Cliente mínimo de Upstash Redis por REST (`fetch`, sin dependencias). Lo usan
 * los límites de uso compartidos y la memoria de sesiones del feed. Es solo un
 * transporte: ni conoce las claves ni decide qué hacer si falla.
 */

/** Tiempo máximo de cada llamada: es una comprobación en el camino de la petición. */
export const UPSTASH_TIMEOUT_MS = 800

export type RedisCommand = ReadonlyArray<string | number>

type UpstashReply = { result?: unknown; error?: string }

/**
 * Ejecuta varios comandos. `multi-exec` los ejecuta como una transacción (lo
 * que hace falta para «contar y fijar la caducidad» sin dejar una clave sin
 * caducar si algo se corta entre medias); `pipeline` solo los agrupa.
 *
 * @throws si no hay almacén, si responde mal o si tarda más del tiempo máximo
 */
export async function runRedis(
  commands: ReadonlyArray<RedisCommand>,
  mode: 'pipeline' | 'multi-exec' = 'pipeline',
): Promise<unknown[]> {
  const { url, token } = getRateLimitStoreEnv()

  if (!url || !token) {
    throw new Error('No hay almacén compartido de límites configurado.')
  }

  const response = await fetch(`${url.replace(/\/+$/, '')}/${mode}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
    signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`El almacén de límites respondió ${response.status}.`)
  }

  const replies = (await response.json()) as UpstashReply[]

  if (!Array.isArray(replies) || replies.length !== commands.length) {
    throw new Error('Respuesta inesperada del almacén de límites.')
  }

  for (const reply of replies) {
    if (reply.error) {
      throw new Error(`El almacén de límites devolvió un error: ${reply.error}`)
    }
  }

  return replies.map((reply) => reply.result)
}

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { clientIpFromHeaders } from '@/lib/http/clientIpFromHeaders'
import { getIpHashEnv } from '@/lib/serverEnv'

export { clientIpFromHeaders }

/** La misma lectura sobre las cabeceras de la petición en curso (Server Actions, Server Components). */
async function getClientIp(): Promise<string | null> {
  return clientIpFromHeaders(await headers())
}

/**
 * Hash con sal de la IP — determinista (misma IP, mismo hash siempre,
 * necesario para contar envíos por IP) pero no trivialmente reversible
 * contra un listado de IPs candidatas. Nunca se guarda la IP en crudo,
 * ver la migración de contact_submission.
 */
export async function getHashedClientIp(): Promise<string> {
  return hashClientIp(await getClientIp())
}

/**
 * El mismo hash para una IP ya leída (rutas API, que tienen la petición en la
 * mano y no necesitan `headers()`). `null` = IP desconocida.
 */
export function hashClientIp(ip: string | null): string {
  return createHash('sha256')
    .update(`${getIpHashEnv().CONTACT_IP_HASH_SALT}:${ip ?? 'unknown'}`)
    .digest('hex')
}

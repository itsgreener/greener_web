import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { getIpHashEnv } from '@/lib/serverEnv'

/**
 * Dirección IP real del visitante detrás del proxy inverso de Dinahosting (lo
 * gestiona Dinahosting y no es configurable por nosotros; la app corre con
 * PM2 — despliegue.md §6): x-forwarded-for lleva la cadena completa de
 * saltos, "cliente, proxy1, proxy2..."; el primero es el cliente original.
 * Sin ese encabezado (desarrollo local sin proxy delante, o un proxy que no
 * lo envíe) no hay forma fiable de saber la IP real — se trata como
 * "desconocida" en vez de inventar un valor. OJO: en ese caso TODOS los
 * visitantes comparten el mismo hash y el límite de envíos (5 por hora,
 * contactSubmissionLog.ts) se aplicaría al sitio entero, no por persona:
 * hay que comprobarlo tras el primer despliegue (despliegue.md §6, punto 3).
 */
export function clientIpFromHeaders(
  headerList: Pick<Headers, 'get'>,
): string | null {
  const first = headerList.get('x-forwarded-for')?.split(',')[0]?.trim()

  return first || headerList.get('x-real-ip')
}

/** La misma lectura sobre las cabeceras de la petición en curso (Server Actions, Server Components). */
export async function getClientIp(): Promise<string | null> {
  return clientIpFromHeaders(await headers())
}

/**
 * Hash con sal de la IP — determinista (misma IP, mismo hash siempre,
 * necesario para contar envíos por IP) pero no trivialmente reversible
 * contra un listado de IPs candidatas. Nunca se guarda la IP en crudo,
 * ver la migración de contact_submission.
 */
export async function getHashedClientIp(): Promise<string> {
  const ip = (await getClientIp()) ?? 'unknown'
  return createHash('sha256')
    .update(`${getIpHashEnv().CONTACT_IP_HASH_SALT}:${ip}`)
    .digest('hex')
}

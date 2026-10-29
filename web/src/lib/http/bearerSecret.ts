import { createHash, timingSafeEqual } from 'node:crypto'

export type BearerAuth = 'ok' | 'not_configured' | 'unauthorized'

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/**
 * Comprueba `Authorization: Bearer <secreto>` contra un secreto de servidor
 * (purga de talent, tareas programadas). Se comparan los hashes (mismo largo
 * siempre) con `timingSafeEqual`, de modo que ni el contenido ni la longitud
 * del secreto se filtran por el tiempo de respuesta. Sin secreto configurado
 * la ruta queda cerrada del todo.
 */
export function checkBearerSecret(
  headers: Pick<Headers, 'get'>,
  secret: string | undefined,
): BearerAuth {
  if (!secret) return 'not_configured'

  const match = /^Bearer (.+)$/.exec(headers.get('authorization') ?? '')

  if (!match) return 'unauthorized'

  return timingSafeEqual(digest(match[1]), digest(secret))
    ? 'ok'
    : 'unauthorized'
}

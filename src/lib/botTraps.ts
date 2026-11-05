import { clientIpFromHeaders } from '@/lib/http/clientIpFromHeaders'
import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'

/**
 * Trampas para bots maleducados (14 oct 2026). Dos tipos de petición que un
 * visitante real nunca hace:
 *
 * - `trap`: la ruta señuelo. Está prohibida en robots.txt y enlazada en la web
 *   de forma invisible (ver `BotTrapLink`). La visita un bot que ignora
 *   robots.txt y sigue todos los enlaces, o uno que lee robots.txt buscando
 *   rutas «jugosas».
 * - `probe`: rutas típicas de escáneres de vulnerabilidades (WordPress, PHP,
 *   `.env`, `.git`…). Greener no tiene nada de eso, así que cualquier
 *   petición es de un escáner.
 *
 * Solo se REGISTRA y se responde 404 sin renderizar nada: no se bloquea por
 * IP. Detrás del proxy de Dinahosting aún no está comprobado que llegue la IP
 * real del visitante (PROGRESO §4.1); si no llegara, bloquear una IP bloquearía
 * a todo el mundo. Con los registros (PM2) se bloquea después en el proxy.
 */

/** Ruta señuelo: lo bastante tentadora para un scraper, sin significado real. */
export const TRAP_PATH = '/internal/client-list'

export type BotTrapKind = 'trap' | 'probe'

const PROBE_PATTERNS: readonly RegExp[] = [
  // Cualquier .php: el sitio no tiene PHP.
  /\.php$/i,
  /^\/wp-(admin|content|includes|json)(\/|$)/i,
  /^\/(phpmyadmin|pma|cgi-bin|vendor\/phpunit)(\/|$)/i,
  // Ficheros de entorno y de control de versiones. `/.well-known/` no entra.
  /^\/\.(env|git|svn|hg|aws|ssh|htaccess|htpasswd)(\/|$|\.)/i,
]

export function classifyBotTrap(pathname: string): BotTrapKind | null {
  if (pathname === TRAP_PATH || pathname.startsWith(`${TRAP_PATH}/`)) {
    return 'trap'
  }

  return PROBE_PATTERNS.some((pattern) => pattern.test(pathname))
    ? 'probe'
    : null
}

// Un escáner puede lanzar cientos de peticiones por segundo: el registro
// tiene su propio tope para no llenar el disco de logs.
const logLimiter = createFixedWindowRateLimiter({ max: 60, windowMs: 60_000 })

const MAX_FIELD_LENGTH = 200

function clip(value: string | null): string {
  return (value ?? '-').slice(0, MAX_FIELD_LENGTH)
}

/**
 * Una línea JSON por visita, fácil de filtrar en los logs de PM2
 * (`grep bot-trap`). La IP es la que resuelve `clientIpFromHeaders` (el último
 * valor de `X-Forwarded-For`, el que añade el proxy de Dinahosting). Aun así
 * sirve para detectar, no para condenar. Es un dato de seguridad con retención corta (la de los logs).
 */
export function logBotTrap(
  kind: BotTrapKind,
  request: { headers: Headers; url: string },
): void {
  if (!logLimiter.check('bot-trap')) return

  console.warn(
    JSON.stringify({
      event: 'bot-trap',
      kind,
      path: clip(new URL(request.url).pathname),
      ip: clip(clientIpFromHeaders(request.headers)),
      userAgent: clip(request.headers.get('user-agent')),
    }),
  )
}

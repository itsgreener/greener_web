/**
 * Dirección IP real del visitante detrás del proxy inverso de Dinahosting (lo
 * gestiona Dinahosting y no es configurable por nosotros; la app corre con
 * PM2 — despliegue.md §6).
 *
 * Comprobado el 14 oct 2026 en insight.itsgreener.com (mismo proxy): el proxy
 * AÑADE la IP del cliente AL FINAL de x-forwarded-for, sin quitar lo que el
 * cliente haya mandado (`X-Forwarded-For: 1.2.3.4` llega como
 * "1.2.3.4, <IP real>"). Por eso el valor de confianza es el ÚLTIMO: el
 * primero lo escribe quien hace la petición y se puede falsificar para
 * esquivar el límite de envíos. Hay un solo salto de proxy; si algún día
 * hubiera más (una CDN delante), habría que revisar esta posición.
 * x-real-ip (que el proxy también rellena) queda como respaldo.
 * Sin ninguna de las dos (desarrollo local sin proxy) la IP es "desconocida"
 * en vez de inventada. OJO: en ese caso TODOS los visitantes comparten el
 * mismo hash y el límite de envíos (5 por hora, contactSubmissionLog.ts) se
 * aplicaría al sitio entero.
 */
export function clientIpFromHeaders(
  headerList: Pick<Headers, 'get'>,
): string | null {
  const chain = headerList.get('x-forwarded-for')?.split(',') ?? []
  const last = chain[chain.length - 1]?.trim()

  return last || headerList.get('x-real-ip')?.trim() || null
}

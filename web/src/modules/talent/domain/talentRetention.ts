/**
 * Plazo de conservación de los candidatos (criterio de Greener, 20 oct 2026).
 *
 * - **Con fecha:** cuenta `candidates.created_at`, el momento en que el
 *   candidato (alta por email) o el personal (subida de CV) lo introduce en la
 *   base de datos. A los 2 años de esa fecha toca borrarlo.
 * - **Sin fecha** (filas antiguas con `created_at` nulo): toca borrarlas **un
 *   año después de publicar esta actualización**, es decir, a partir de
 *   `UNDATED_RETENTION_END`. Si la actualización se despliega más tarde que el
 *   20 de octubre de 2026, esta fecha se mueve a un año después del despliegue.
 *
 * Este módulo solo decide *cuándo* caduca una fila. El borrado en sí es
 * `deleteCandidate` (bucket y filas); el CV de Drive y la suscripción de
 * Mailchimp siguen siendo manuales (ver la guía de puesta en marcha).
 */
export const RETENTION_YEARS = 2

/** Un año después del 20 de octubre de 2026 (UTC). */
export const UNDATED_RETENTION_END = new Date('2027-10-20T00:00:00Z')

/**
 * `created_at` es `timestamp` sin zona: se interpreta como UTC. Devuelve
 * `null` si falta o no es una fecha válida (se trata como «sin fecha»).
 */
export function parseCreatedAt(createdAt: string | null | undefined) {
  const value = createdAt?.trim()

  if (!value) return null

  const hasZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(value)
  const date = new Date(hasZone ? value : `${value.replace(' ', 'T')}Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

/** Cuándo caduca la fila: 2 años desde `created_at`, o la fecha fija si no hay. */
export function retentionExpiry(createdAt: string | null | undefined): Date {
  const created = parseCreatedAt(createdAt)

  if (!created) return UNDATED_RETENTION_END

  const expiry = new Date(created)

  expiry.setUTCFullYear(expiry.getUTCFullYear() + RETENTION_YEARS)

  return expiry
}

export function isRetentionExpired(
  createdAt: string | null | undefined,
  now: Date,
): boolean {
  return retentionExpiry(createdAt).getTime() <= now.getTime()
}

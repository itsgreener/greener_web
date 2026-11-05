/**
 * ¿Tiene forma de uuid de Postgres? Para rechazar con 400/404 lo que Postgres
 * rechazaría con un error 22P02 (que acababa en un 500). Admite cualquier
 * versión, igual que el tipo `uuid` de Postgres.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

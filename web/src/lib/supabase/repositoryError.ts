import { mapPostgresError } from './postgresErrors'

/**
 * Error de un repositorio de Supabase: conserva el `code` (SQLSTATE) que
 * devuelve Postgres. Si el código corresponde a un caso de negocio conocido
 * (ver `postgresErrors.ts`) el error es un `DomainError`, que la aplicación
 * distingue por `kind` sin leer el texto del mensaje; si no, es un `Error`
 * normal con su `code`.
 */
export type RepositoryError = Error & { code?: string }

export function createRepositoryError(
  message: string,
  code?: string,
): RepositoryError {
  const mapped = mapPostgresError(message, code)

  if (mapped) {
    return mapped
  }

  const error: RepositoryError = new Error(message)

  error.code = code

  return error
}

/**
 * Error de un repositorio de Supabase: conserva el `code` (SQLSTATE) que
 * devuelve Postgres para que la capa de aplicación o la acción pueda
 * distinguir un conflicto de unicidad (`23505`) de un fallo de permisos
 * (`42501`) sin leer el texto del mensaje.
 */
export type RepositoryError = Error & { code?: string }

export function createRepositoryError(
  message: string,
  code?: string,
): RepositoryError {
  const error: RepositoryError = new Error(message)

  error.code = code

  return error
}

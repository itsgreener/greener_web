import { createRepositoryError } from '@/lib/supabase/repositoryError'

/**
 * Error tal como lo devuelve un repositorio de Supabase: pasa por la misma
 * traducción SQLSTATE → error de dominio que en producción, así que el test
 * ejerce el camino real y no un `Error` con el texto «a mano».
 */
export function dbError(code: string, message: string) {
  return createRepositoryError(message, code)
}

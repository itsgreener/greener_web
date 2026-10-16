import { createPublicReadClient } from '@/lib/supabase/publicReadClient'

/** Tiempo máximo de la comprobación: un monitor no debe quedarse colgado. */
export const HEALTH_CHECK_TIMEOUT_MS = 3_000

/**
 * ¿Responde la base de datos? Una lectura mínima de `feed_config` (una fila
 * pública bajo RLS, sin sesión): comprueba a la vez que la app tiene las
 * variables de Supabase, que llega a la base y que el esquema está aplicado.
 * Nunca lanza ni devuelve detalles del error: solo sí o no.
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const supabase = createPublicReadClient()

    const request = supabase
      .from('feed_config')
      .select('batch_size')
      .limit(1)
      .abortSignal(AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS))

    const { data, error } = await request

    return !error && Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}

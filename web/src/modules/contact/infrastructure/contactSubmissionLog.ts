import { createServiceClient } from '@/lib/supabase/serviceClient'

import type {
  ContactSubmissionLog,
  ContactSubmissionStatus,
  RateLimitCheck,
} from '@/modules/contact/domain/contactPorts'

/**
 * Límite de envíos por IP (arquitectura §14.1) — 5 envíos por hora, valor
 * de partida razonable para un formulario de contacto normal; ajustable
 * aquí si en producción resulta demasiado laxo o demasiado estricto.
 */
export const RATE_LIMIT_MAX_SUBMISSIONS = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hora

/**
 * Cuenta los envíos reales ("sent") de esta IP en la última hora — los
 * intentos bloqueados por honeypot o por el propio límite no cuentan
 * para sí mismos, si no una IP ya bloqueada se quedaría bloqueada para
 * siempre en cuanto tocara el límite una vez.
 */
export async function checkRateLimit(ipHash: string): Promise<RateLimitCheck> {
  try {
    const client = createServiceClient()
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

    const { count, error } = await client
      .from('contact_submission')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('status', 'sent')
      .gte('created_at', since)

    if (error) throw error

    return (count ?? 0) >= RATE_LIMIT_MAX_SUBMISSIONS ? 'limited' : 'allowed'
  } catch (error) {
    // Si no se puede comprobar el límite (Supabase no responde o falta su
    // configuración), el formulario NO envía: falla cerrado, porque uno que
    // se convierte en spam abierto por un fallo de Supabase es peor que uno
    // que deja de funcionar un rato. El caso de uso lo distingue de
    // `limited` para no decirle a quien escribe que ha enviado demasiado.
    console.error('No se pudo comprobar el límite de envíos:', error)
    return 'unavailable'
  }
}

export async function logContactSubmission(
  ipHash: string,
  status: ContactSubmissionStatus,
  error?: string,
): Promise<void> {
  const client = createServiceClient()

  const { error: insertError } = await client
    .from('contact_submission')
    .insert({
      ip_hash: ipHash,
      status,
      error: error ?? null,
    })

  if (insertError) {
    // No relanzar: que falle el registro no debe impedir que el email ya
    // enviado cuente como éxito de cara al usuario — es un "mínimo"
    // (§14.1), no la parte crítica del flujo.
    console.error('No se pudo registrar el envío de contacto:', insertError)
  }
}

export const supabaseContactSubmissionLog: ContactSubmissionLog = {
  checkRateLimit,
  record: logContactSubmission,
}

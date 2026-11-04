import type { ProcessPendingResult } from '@/modules/talent/application/processPendingCvs'
import type {
  AttemptLimiter,
  StaffSessionVerifier,
} from '@/modules/talent/domain/talentPorts'

export type LegacyProcessingResult =
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'rate_limited' }
  | ProcessPendingResult

/**
 * Lanza el procesado de los CVs pendientes a petición de la web antigua de
 * talent (`/private`), cuyo navegador no puede llevar el secreto de n8n.
 *
 * Orden, de lo más barato a lo más caro: tope por IP, sesión de Supabase-talent
 * (Google), correo en la lista, tope por persona y, solo entonces,
 * `processPendingCvs` SIN `force`: conserva sus cautelas (no lanzar si ya hay
 * filas en `started`, enfriamiento entre lanzamientos), así que varias subidas
 * seguidas lanzan n8n una sola vez y lo que quede `pending` espera al siguiente
 * lanzamiento (o al botón «Procesar pendientes» del ABM). Nunca fuerza.
 *
 * Deja constancia en Actividad con el correo de quien subió, de mejor esfuerzo.
 */
export function makeLaunchLegacyProcessing({
  verifier,
  allowedEmails,
  processPendingCvs,
  limiters,
  recordAudit,
}: {
  verifier: StaffSessionVerifier
  /** En minúsculas. Se lee en cada llamada: la lista viene del entorno. */
  allowedEmails: () => readonly string[]
  processPendingCvs: () => Promise<ProcessPendingResult>
  limiters: { byIp: AttemptLimiter; byStaff: AttemptLimiter }
  recordAudit: (event: {
    actorEmail: string
    pending: number
  }) => Promise<unknown>
}) {
  return async function launchLegacyProcessing({
    accessToken,
    ipKey,
  }: {
    accessToken: string
    ipKey: string
  }): Promise<LegacyProcessingResult> {
    if (!(await limiters.byIp.check(ipKey))) return { status: 'rate_limited' }

    const session = await verifier.verify(accessToken)

    if (!session) return { status: 'unauthorized' }

    const email = session.email.toLowerCase()

    if (!allowedEmails().includes(email)) return { status: 'forbidden' }

    if (!(await limiters.byStaff.check(email))) {
      return { status: 'rate_limited' }
    }

    const result = await processPendingCvs()

    if (result.status === 'triggered') {
      await recordAudit({ actorEmail: email, pending: result.pending })
    }

    return result
  }
}

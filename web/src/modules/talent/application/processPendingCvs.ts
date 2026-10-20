import { PROCESS_CV_COOLDOWN_MS } from '@/modules/talent/domain/talentConstants'
import { WebhookNotConfiguredError } from '@/modules/talent/domain/talentErrors'
import type {
  TalentAdminRepository,
  TalentWorkflows,
} from '@/modules/talent/domain/talentPorts'

export type ProcessPendingResult =
  /** Lanzado: n8n procesa ahora las `pending`. */
  | { status: 'triggered'; pending: number }
  | { status: 'nothing_pending' }
  /**
   * No se lanza: ya hay filas en `started` (n8n está trabajando) o se lanzó
   * hace poco desde este proceso. Las `pending` esperan al siguiente lanzamiento.
   */
  | { status: 'busy'; reason: 'in_progress' | 'cooldown'; pending: number }
  | { status: 'not_configured' }
  | { status: 'unavailable' }

/**
 * Lanza `Procesar nuevo CV` **una vez** si procede.
 *
 * El workflow procesa todas las filas `pending` y solo marca `started` cada
 * una cuando le llega su turno. Dos llamadas seguidas (dos personas subiendo a
 * la vez, un doble clic) las procesarían dos veces: coste de OpenAI, ficheros
 * duplicados en Drive y avisos de «email duplicado» a quien subió. Dos
 * cautelas, ninguna perfecta:
 * 1. Si hay filas en `started`, n8n está trabajando: no se lanza.
 * 2. Tras un lanzamiento no se vuelve a lanzar hasta pasados
 *    `PROCESS_CV_COOLDOWN_MS` (en la memoria del proceso, como los límites de
 *    peticiones). Cubre el hueco entre una fila y la siguiente y los dobles clics.
 *
 * Una fila que se queda en `started` para siempre (el caso de las 23 de la
 * guía de puesta en marcha) bloquearía el primer control. Por eso el ABM
 * ofrece «Lanzar igualmente» (`force`), que se salta ese control pero no el
 * segundo: quien lo usa sabe que no hay un procesado en marcha.
 *
 * No sabe cuándo termina n8n (responde 200 en cuanto recibe la llamada): por
 * eso el ABM enseña los contadores por estado.
 */
export function makeProcessPendingCvs({
  admin,
  workflows,
  now = Date.now,
  cooldownMs = PROCESS_CV_COOLDOWN_MS,
}: {
  admin: TalentAdminRepository
  workflows: TalentWorkflows
  now?: () => number
  cooldownMs?: number
}) {
  let lastLaunch = Number.NEGATIVE_INFINITY

  return async function processPendingCvs(
    options: { force?: boolean } = {},
  ): Promise<ProcessPendingResult> {
    try {
      const counts = await admin.countByStatus()
      const pending = counts.pending ?? 0

      if (pending === 0) return { status: 'nothing_pending' }

      if (!options.force && (counts.started ?? 0) > 0) {
        return { status: 'busy', reason: 'in_progress', pending }
      }

      const current = now()

      if (current - lastLaunch < cooldownMs) {
        return { status: 'busy', reason: 'cooldown', pending }
      }

      // Se anota antes de llamar: dos peticiones simultáneas no lanzan dos veces.
      lastLaunch = current

      try {
        await workflows.processPendingCvs()
      } catch (error) {
        lastLaunch = Number.NEGATIVE_INFINITY

        throw error
      }

      return { status: 'triggered', pending }
    } catch (error) {
      if (error instanceof WebhookNotConfiguredError) {
        return { status: 'not_configured' }
      }

      console.error('Talent: no se pudo lanzar el procesado de CVs', error)

      return { status: 'unavailable' }
    }
  }
}

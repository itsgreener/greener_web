import type { TalentAdminRepository } from '@/modules/talent/domain/talentPorts'

import type { ProcessPendingResult } from './processPendingCvs'

export type ReprocessCandidateResult =
  | { ok: true; processing: ProcessPendingResult }
  | { ok: false; reason: 'not_found' | 'not_reprocessable' | 'unavailable' }

/**
 * «Reprocesar» una fila atascada (`started`) o fallida (`error`) cuyo CV sigue
 * en el bucket: la devuelve a `pending` y lanza el procesado con las mismas
 * cautelas que una subida. Es el equivalente de la acción manual de la guía de
 * puesta en marcha (§4.2). Si el procesado no se puede lanzar ahora (hay otro
 * en marcha), la fila queda en `pending` y la recogerá el siguiente.
 */
export function makeReprocessCandidate({
  admin,
  processPendingCvs,
}: {
  admin: TalentAdminRepository
  processPendingCvs: (options?: {
    force?: boolean
  }) => Promise<ProcessPendingResult>
}) {
  return async function reprocessCandidate(
    candidateId: string,
  ): Promise<ReprocessCandidateResult> {
    try {
      const candidate = await admin.findAccessById(candidateId)

      if (!candidate) return { ok: false, reason: 'not_found' }

      if (!(await admin.requeueForProcessing(candidateId))) {
        return { ok: false, reason: 'not_reprocessable' }
      }
    } catch (error) {
      console.error('Talent: no se pudo reprocesar al candidato', error)

      return { ok: false, reason: 'unavailable' }
    }

    return { ok: true, processing: await processPendingCvs() }
  }
}

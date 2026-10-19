import type {
  TalentFileStorage,
  TalentRepository,
} from '@/modules/talent/domain/talentPorts'
import { isWellFormedToken } from '@/modules/talent/domain/talentSchemas'

import type { TalentLimiters } from './talentLimiters'
import type { TalentFailure, TalentRequestContext } from './talentResults'

export type DeleteCandidateFileResult = { ok: true } | TalentFailure

/**
 * `DELETE /api/talent/form/[token]/files`: el candidato quita un fichero que
 * subió y n8n aún no ha procesado. Solo se puede borrar lo que pertenece a ese
 * token y sigue `pending`: lo que ya está en Drive no lo gobierna la web.
 */
export function makeDeleteCandidateFile({
  repository,
  storage,
  limiters,
}: {
  repository: TalentRepository
  storage: TalentFileStorage
  limiters: TalentLimiters
}) {
  return async function deleteCandidateFile(
    token: string,
    fileId: string,
    context: TalentRequestContext,
  ): Promise<DeleteCandidateFileResult> {
    if (!limiters.uploadByIp.check(context.ipKey)) {
      return { ok: false, reason: 'rate_limited' }
    }

    if (!isWellFormedToken(token)) return { ok: false, reason: 'not_found' }

    if (!limiters.uploadByToken.check(token)) {
      return { ok: false, reason: 'rate_limited' }
    }

    try {
      const candidate = await repository.findAccessByToken(token)

      if (!candidate) return { ok: false, reason: 'not_found' }

      const file = await repository.findPendingFile(candidate.id, fileId)

      if (!file) return { ok: false, reason: 'not_found' }

      // Primero la fila: si el borrado del objeto falla, queda un objeto sin
      // referencia (se registra), no una fila que apunta a nada.
      await repository.deleteFile(candidate.id, file.id)

      await storage.remove(file.path).catch((error) => {
        console.error('Talent: objeto huérfano en el bucket', file.path, error)
      })

      return { ok: true }
    } catch (error) {
      console.error('Talent: no se pudo borrar el fichero', error)

      return { ok: false, reason: 'unavailable' }
    }
  }
}

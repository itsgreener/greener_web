import type {
  TalentAdminRepository,
  TalentFileStorage,
} from '@/modules/talent/domain/talentPorts'
import { isRetentionExpired } from '@/modules/talent/domain/talentRetention'

import { removeCandidate } from './deleteCandidate'

/** Tope por llamada: la purga va por tandas pequeñas, sin acumular. */
export const PURGE_MAX_BATCH = 50

export type PurgeCandidate = {
  id: string
  /** Objetos del bucket que se borrarán (o se han borrado). */
  bucketFiles: number
  /**
   * Enlaces de Drive u otros que la web NO puede borrar: los borra n8n. Son
   * enlaces a ficheros, sin nombre ni email del candidato.
   */
  externalLinks: string[]
}

export type PurgeOutcome =
  | ({ status: 'deleted' } & PurgeCandidate)
  | { status: 'not_found' | 'not_expired' | 'error'; id: string }

export type PurgeAuditEvent = {
  action: 'talent.candidate_purge'
  entityId: string
  payload: { bucketFiles: number; externalFiles: number }
}

/**
 * Purga por plazo de conservación (`talentRetention.ts`). Dos pasos pensados
 * para n8n, que es quien borra lo de Drive:
 *
 * 1. `list`: qué ha caducado, con los enlaces de Drive de cada candidato. No
 *    borra nada.
 * 2. `purge(ids)`: borra EXACTAMENTE esos ids. Comprueba otra vez que cada uno
 *    ha caducado, de modo que una llamada equivocada (o con un id ajeno) no
 *    puede borrar a un candidato vigente.
 *
 * Así n8n borra primero en Drive y después se borra la fila, y los enlaces no
 * se pierden si algo falla en medio.
 */
export function makePurgeExpiredCandidates({
  admin,
  storage,
  now,
  recordAudit,
}: {
  admin: TalentAdminRepository
  storage: TalentFileStorage
  now: () => Date
  recordAudit: (event: PurgeAuditEvent) => Promise<boolean>
}) {
  async function targetOf(id: string) {
    const target = await admin.findDeletionTarget(id)

    if (!target) return { kind: 'not_found' as const }

    return isRetentionExpired(target.createdAt, now())
      ? { kind: 'expired' as const, target }
      : { kind: 'not_expired' as const }
  }

  async function list(
    limit: number,
  ): Promise<{ expired: PurgeCandidate[]; more: boolean }> {
    const size = Math.min(Math.max(limit, 1), PURGE_MAX_BATCH)
    const ids = await admin.listExpiredCandidateIds(now(), size + 1)
    const expired: PurgeCandidate[] = []

    for (const id of ids.slice(0, size)) {
      const found = await targetOf(id)

      if (found.kind !== 'expired') continue

      expired.push({
        id,
        bucketFiles: found.target.bucketPaths.length,
        externalLinks: found.target.externalPaths,
      })
    }

    return { expired, more: ids.length > size }
  }

  async function purge(ids: string[]): Promise<PurgeOutcome[]> {
    const outcomes: PurgeOutcome[] = []

    for (const id of [...new Set(ids)].slice(0, PURGE_MAX_BATCH)) {
      try {
        const found = await targetOf(id)

        if (found.kind !== 'expired') {
          outcomes.push({ status: found.kind, id })
          continue
        }

        await removeCandidate({ admin, storage }, found.target)

        const outcome: PurgeCandidate = {
          id,
          bucketFiles: found.target.bucketPaths.length,
          externalLinks: found.target.externalPaths,
        }

        outcomes.push({ status: 'deleted', ...outcome })

        const recorded = await recordAudit({
          action: 'talent.candidate_purge',
          entityId: id,
          payload: {
            bucketFiles: outcome.bucketFiles,
            externalFiles: outcome.externalLinks.length,
          },
        })

        // Borrar a quien ya ha caducado no puede depender del registro: si no
        // se escribe, queda en el log del servidor y se sigue.
        if (!recorded) {
          console.error(`Talent: purga de ${id} sin registro en Actividad`)
        }
      } catch (error) {
        console.error('Talent: no se pudo purgar un candidato', error)
        outcomes.push({ status: 'error', id })
      }
    }

    return outcomes
  }

  return { list, purge }
}

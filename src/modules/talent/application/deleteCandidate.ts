import type { CandidateDeletionTarget } from '@/modules/talent/domain/talentAdminModels'
import type {
  TalentAdminRepository,
  TalentFileStorage,
} from '@/modules/talent/domain/talentPorts'

/**
 * El borrado en sí, ya con el objetivo leído: objetos del bucket y, solo si
 * salen bien, las filas. Lo comparten el botón del ABM y la purga por plazo.
 */
export async function removeCandidate(
  {
    admin,
    storage,
  }: { admin: TalentAdminRepository; storage: TalentFileStorage },
  target: CandidateDeletionTarget,
): Promise<void> {
  for (const path of target.bucketPaths) await storage.remove(path)

  await admin.deleteCandidateRows(target.id)
}

export type DeleteCandidateResult =
  | {
      ok: true
      /** Objetos del bucket borrados. */
      bucketFiles: number
      /** CVs o enlaces que NO se han podido borrar (Drive u otros): a mano. */
      externalFiles: number
      /** Estaba suscrito al newsletter: la baja en Mailchimp es manual. */
      newsletterAccepted: boolean
    }
  | { ok: false; reason: 'not_found' | 'unavailable' }

/**
 * Derecho de supresión: borra a un candidato entero. Orden: primero los
 * objetos del bucket y, solo si salen bien, las filas. Si fallara al revés
 * quedaría un CV en el bucket sin ninguna fila que lo señale, y nadie lo
 * volvería a ver. Si falla el borrado de las filas, los objetos ya no están:
 * repetir la acción es seguro (borrar un objeto que no existe no falla).
 *
 * Lo que no puede hacer desde aquí, y devuelve para que el ABM lo avise: el CV
 * que n8n ya movió a Google Drive y la suscripción de Mailchimp.
 */
export function makeDeleteCandidate({
  admin,
  storage,
}: {
  admin: TalentAdminRepository
  storage: TalentFileStorage
}) {
  return async function deleteCandidate(
    candidateId: string,
  ): Promise<DeleteCandidateResult> {
    try {
      const target = await admin.findDeletionTarget(candidateId)

      if (!target) return { ok: false, reason: 'not_found' }

      await removeCandidate({ admin, storage }, target)

      return {
        ok: true,
        bucketFiles: target.bucketPaths.length,
        externalFiles: target.externalPaths.length,
        newsletterAccepted: target.newsletterAccepted,
      }
    } catch (error) {
      console.error('Talent: no se pudo eliminar al candidato', error)

      return { ok: false, reason: 'unavailable' }
    }
  }
}

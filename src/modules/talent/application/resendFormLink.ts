import { CANDIDATE_STATUS_IN_PROCESS } from '@/modules/talent/domain/talentConstants'
import type {
  TalentAdminRepository,
  TalentWorkflows,
} from '@/modules/talent/domain/talentPorts'

export type ResendFormLinkResult =
  | { ok: true }
  | {
      ok: false
      reason: 'not_found' | 'no_email' | 'in_process' | 'unavailable'
    }

/**
 * Reenvía el enlace del formulario a un candidato. Mismas reglas que el
 * reenvío del alta pública: no si n8n está procesando la fila (al terminar
 * envía el enlace por su cuenta) y, si la fila no tiene `access_token`, se
 * genera antes. Siempre renueva la vigencia del enlace (una semana). Efecto conocido: una fila `closed` pasa a `sent`
 * hasta que complete el formulario otra vez (contrato de datos, §2).
 */
export function makeResendFormLink({
  admin,
  workflows,
  newToken,
}: {
  admin: TalentAdminRepository
  workflows: TalentWorkflows
  newToken: () => string
}) {
  return async function resendFormLink(
    candidateId: string,
  ): Promise<ResendFormLinkResult> {
    try {
      const candidate = await admin.findAccessById(candidateId)

      if (!candidate) return { ok: false, reason: 'not_found' }

      if (!candidate.email) return { ok: false, reason: 'no_email' }

      if (CANDIDATE_STATUS_IN_PROCESS.includes(candidate.status)) {
        return { ok: false, reason: 'in_process' }
      }

      // Se vuelve a guardar el token (el mismo o uno nuevo si faltaba) para
      // abrir otra semana de vigencia: el enlace del formulario caduca.
      const accessToken = candidate.accessToken ?? newToken()

      await admin.setAccessToken(candidate.id, accessToken)
      await workflows.sendFormLink(accessToken)

      return { ok: true }
    } catch (error) {
      console.error('Talent: no se pudo reenviar el enlace', error)

      return { ok: false, reason: 'unavailable' }
    }
  }
}

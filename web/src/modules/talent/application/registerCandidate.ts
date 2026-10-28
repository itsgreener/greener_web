import { fieldErrorsOf } from '@/lib/forms/formActionState'

import { CANDIDATE_STATUS_IN_PROCESS } from '@/modules/talent/domain/talentConstants'
import { DuplicateCandidateEmailError } from '@/modules/talent/domain/talentErrors'
import type { CandidateAccess } from '@/modules/talent/domain/talentModels'
import type {
  TalentRepository,
  TalentWorkflows,
} from '@/modules/talent/domain/talentPorts'
import { buildSignupRow } from '@/modules/talent/domain/talentRows'
import { signupSchema } from '@/modules/talent/domain/talentSchemas'

import type { TalentLimiters } from './talentLimiters'
import type { TalentFailure, TalentRequestContext } from './talentResults'

export type RegisterCandidateResult = { ok: true } | TalentFailure

/**
 * Alta por email (`POST /api/talent/candidates`): honeypot → validación →
 * límites → alta o reenvío.
 *
 * **La respuesta es la misma exista o no el email.** Hoy `/` enseña el error de
 * Postgres (`duplicate key value…`) y delata quién está en la base. Si el email
 * ya existe se reenvía el enlace con su `access_token` (se genera uno si no
 * lo tiene); al visitante no se le dice cuál de los dos casos ha ocurrido.
 *
 * No se reenvía si n8n está procesando la fila (`pending`, `started`): al
 * terminar, `Procesar nuevo CV` envía el enlace por su cuenta.
 */
export function makeRegisterCandidate({
  repository,
  workflows,
  limiters,
  newToken,
}: {
  repository: TalentRepository
  workflows: TalentWorkflows
  limiters: TalentLimiters
  /** UUID v4 generado en el servidor. */
  newToken: () => string
}) {
  return async function registerCandidate(
    input: unknown,
    honeypot: string,
    context: TalentRequestContext,
  ): Promise<RegisterCandidateResult> {
    // El bot que rellena el honeypot recibe el mismo éxito.
    if (honeypot.trim()) return { ok: true }

    const parsed = signupSchema.safeParse(input)

    if (!parsed.success) {
      return {
        ok: false,
        reason: 'invalid',
        fieldErrors: fieldErrorsOf(parsed.error),
      }
    }

    const { email } = parsed.data

    if (
      !limiters.signupByIp.check(context.ipKey) ||
      !limiters.signupByVisitor.check(context.visitorKey) ||
      !limiters.signupByEmail.check(email)
    ) {
      return { ok: false, reason: 'rate_limited' }
    }

    try {
      let existing = await repository.findByEmail(email)

      if (!existing) {
        const accessToken = newToken()

        try {
          await repository.insertCandidate(buildSignupRow(email, accessToken))
          await workflows.sendFormLink(accessToken)

          return { ok: true }
        } catch (error) {
          // Dos altas a la vez: la otra llegó antes. Se sigue como un reenvío.
          if (!(error instanceof DuplicateCandidateEmailError)) throw error

          existing = await repository.findByEmail(email)
        }
      }

      if (existing) await resendLink(existing)

      return { ok: true }
    } catch (error) {
      console.error(
        'Talent: no se pudo dar de alta o reenviar el enlace',
        error,
      )

      return { ok: false, reason: 'unavailable' }
    }
  }

  async function resendLink(existing: CandidateAccess) {
    if (CANDIDATE_STATUS_IN_PROCESS.includes(existing.status)) return

    // Sin token no se puede enviar: se genera. Con él se conserva, pero se
    // vuelve a guardar para abrir otra semana de vigencia (el enlace caduca).
    const accessToken = existing.accessToken ?? newToken()

    await repository.setAccessToken(existing.id, accessToken)
    await workflows.sendFormLink(accessToken)
  }
}

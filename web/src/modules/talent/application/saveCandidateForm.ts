import { fieldErrorsOf } from '@/lib/forms/formActionState'

import type {
  TalentNewsletter,
  TalentRepository,
  TalentWorkflows,
} from '@/modules/talent/domain/talentPorts'
import {
  buildCandidateUpdate,
  buildProjectRows,
} from '@/modules/talent/domain/talentRows'
import {
  candidateFormSchema,
  isWellFormedToken,
} from '@/modules/talent/domain/talentSchemas'

import type { TalentLimiters } from './talentLimiters'
import type { TalentFailure, TalentRequestContext } from './talentResults'

export type SaveCandidateFormResult = { ok: true } | TalentFailure

/**
 * `PUT /api/talent/form/[token]`: la misma secuencia de hoy, con el control de
 * errores en un solo sitio.
 *
 * 1. candidato (`candidates`), 2. proyectos (`projects`), 3. newsletter si la
 * ha aceptado, 4. webhook `Guardar archivos` con `{candidate_id}`.
 *
 * Reintentar es seguro: todo se sobrescribe. La newsletter no bloquea el envío
 * (un fallo de Mailchimp no debe impedir que el candidato termine). Sí falla
 * el webhook: sin él n8n no avisa a Greener y la fila no llega a `closed`, así
 * que se pide reintentar.
 */
export function makeSaveCandidateForm({
  repository,
  workflows,
  newsletter,
  limiters,
}: {
  repository: TalentRepository
  workflows: TalentWorkflows
  newsletter: TalentNewsletter
  limiters: TalentLimiters
}) {
  return async function saveCandidateForm(
    token: string,
    input: unknown,
    honeypot: string,
    context: TalentRequestContext,
  ): Promise<SaveCandidateFormResult> {
    if (honeypot.trim()) return { ok: true }

    // IP primero; el token solo cuenta si tiene forma de token, para que quien
    // manda cadenas inventadas no llene la memoria del limitador.
    if (!limiters.formSaveByIp.check(context.ipKey)) {
      return { ok: false, reason: 'rate_limited' }
    }

    if (!isWellFormedToken(token)) return { ok: false, reason: 'not_found' }

    if (!limiters.formSaveByToken.check(token)) {
      return { ok: false, reason: 'rate_limited' }
    }

    try {
      const candidate = await repository.findAccessByToken(token)

      if (!candidate || !candidate.accessToken) {
        return { ok: false, reason: 'not_found' }
      }

      const parsed = candidateFormSchema.safeParse(input)

      if (!parsed.success) {
        return {
          ok: false,
          reason: 'invalid',
          fieldErrors: fieldErrorsOf(parsed.error),
        }
      }

      const form = parsed.data

      await repository.updateCandidate(candidate.id, buildCandidateUpdate(form))
      await repository.replaceProjects(
        candidate.id,
        buildProjectRows(candidate.id, candidate.accessToken, form),
      )

      if (form.newsletterAccepted) {
        await subscribeBestEffort(candidate.email)
      }

      await workflows.processCandidate(candidate.id)

      return { ok: true }
    } catch (error) {
      console.error('Talent: no se pudo guardar el formulario', error)

      return { ok: false, reason: 'unavailable' }
    }
  }

  async function subscribeBestEffort(email: string | null) {
    if (!email) return

    try {
      await newsletter.subscribe(email)
    } catch (error) {
      console.error('Talent: no se pudo dar de alta en la newsletter', error)
    }
  }
}

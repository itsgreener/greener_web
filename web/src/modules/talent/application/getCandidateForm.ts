import type { CandidateFormView } from '@/modules/talent/domain/talentModels'
import type { TalentRepository } from '@/modules/talent/domain/talentPorts'
import { isWellFormedToken } from '@/modules/talent/domain/talentSchemas'

import type { TalentLimiters } from './talentLimiters'
import type { TalentFailure, TalentRequestContext } from './talentResults'

export type GetCandidateFormResult =
  { ok: true; form: CandidateFormView } | TalentFailure

function extensionOf(path: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(path)

  return match ? match[1].toLowerCase() : ''
}

/**
 * `GET /api/talent/form/[token]`: lo que necesita el formulario y nada más
 * (ver `CandidateFormView`). Un token que no existe y uno mal formado dan la
 * misma respuesta.
 */
export function makeGetCandidateForm({
  repository,
  limiters,
}: {
  repository: TalentRepository
  limiters: TalentLimiters
}) {
  return async function getCandidateForm(
    token: string,
    context: TalentRequestContext,
  ): Promise<GetCandidateFormResult> {
    if (!limiters.formReadByIp.check(context.ipKey)) {
      return { ok: false, reason: 'rate_limited' }
    }

    if (!isWellFormedToken(token)) return { ok: false, reason: 'not_found' }

    try {
      const record = await repository.findFormByToken(token)

      if (!record) return { ok: false, reason: 'not_found' }

      return {
        ok: true,
        form: {
          email: record.email ?? '',
          name: record.name ?? '',
          phone: record.phone ?? '',
          comment: record.comment ?? '',
          profile: record.profile ?? [],
          experience: record.experience ?? '',
          workTypes: record.workTypes ?? [],
          rateDay: record.rateDay,
          rateHour: record.rateHour,
          languages: record.languages ?? {},
          socials: record.socials ?? {},
          newsletterAccepted: record.newsletterAccepted ?? false,
          projects: record.projects,
          files: record.files.map((file) => ({
            id: file.id,
            extension: extensionOf(file.path),
          })),
        },
      }
    } catch (error) {
      console.error('Talent: no se pudo leer el formulario', error)

      return { ok: false, reason: 'unavailable' }
    }
  }
}

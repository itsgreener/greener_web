import 'server-only'

import { randomUUID } from 'node:crypto'

import { createSharedRateLimiter } from '@/lib/rateLimit/sharedRateLimiter'

import { recordSystemAuditEvent } from '@/modules/audit/container'

import { makeDeleteCandidate } from './application/deleteCandidate'
import { makeDeleteCandidateFile } from './application/deleteCandidateFile'
import { makeGetCandidateForm } from './application/getCandidateForm'
import { makeProcessPendingCvs } from './application/processPendingCvs'
import { makePurgeExpiredCandidates } from './application/purgeExpiredCandidates'
import { makeRegisterCandidate } from './application/registerCandidate'
import { makeReprocessCandidate } from './application/reprocessCandidate'
import { makeResendFormLink } from './application/resendFormLink'
import { makeResolveCvLink } from './application/resolveCvLink'
import { makeSaveCandidateForm } from './application/saveCandidateForm'
import { makeTalentAdminQueries } from './application/talentAdminQueries'
import {
  TALENT_LIMITS,
  type TalentLimiters,
} from './application/talentLimiters'
import { makeUploadCandidateFile } from './application/uploadCandidateFile'
import { makeUploadStaffCv } from './application/uploadStaffCv'
import { n8nTalentWorkflows } from './infrastructure/n8nTalentWorkflows'
import { supabaseTalentAdminRepository } from './infrastructure/supabaseTalentAdminRepository'
import { supabaseTalentRepository } from './infrastructure/supabaseTalentRepository'
import { supabaseTalentStorage } from './infrastructure/supabaseTalentStorage'
import { talentMailchimpNewsletter } from './infrastructure/talentMailchimp'
import { cloudmersiveTalentScanner } from './infrastructure/talentVirusScanner'

/**
 * Composition root de talent. Los límites cuentan en un almacén compartido
 * entre instancias (Upstash, SEC-PUB-A1) y, si no está configurado o falla,
 * en memoria de la instancia: amortiguan, no son una defensa contra abuso
 * deliberado. Ver `sharedRateLimiter.ts`.
 */

const limiters: TalentLimiters = {
  signupByIp: createSharedRateLimiter({
    name: 'talent-signupByIp',
    ...TALENT_LIMITS.signupByIp,
  }),
  signupByVisitor: createSharedRateLimiter({
    name: 'talent-signupByVisitor',
    ...TALENT_LIMITS.signupByVisitor,
  }),
  signupByEmail: createSharedRateLimiter({
    name: 'talent-signupByEmail',
    ...TALENT_LIMITS.signupByEmail,
  }),
  formReadByIp: createSharedRateLimiter({
    name: 'talent-formReadByIp',
    ...TALENT_LIMITS.formReadByIp,
  }),
  formSaveByIp: createSharedRateLimiter({
    name: 'talent-formSaveByIp',
    ...TALENT_LIMITS.formSaveByIp,
  }),
  formSaveByToken: createSharedRateLimiter({
    name: 'talent-formSaveByToken',
    ...TALENT_LIMITS.formSaveByToken,
  }),
  uploadByIp: createSharedRateLimiter({
    name: 'talent-uploadByIp',
    ...TALENT_LIMITS.uploadByIp,
  }),
  uploadByToken: createSharedRateLimiter({
    name: 'talent-uploadByToken',
    ...TALENT_LIMITS.uploadByToken,
  }),
}

export const registerCandidate = makeRegisterCandidate({
  repository: supabaseTalentRepository,
  workflows: n8nTalentWorkflows,
  limiters,
  newToken: randomUUID,
})

export const getCandidateForm = makeGetCandidateForm({
  repository: supabaseTalentRepository,
  limiters,
})

export const saveCandidateForm = makeSaveCandidateForm({
  repository: supabaseTalentRepository,
  workflows: n8nTalentWorkflows,
  newsletter: talentMailchimpNewsletter,
  limiters,
})

export const uploadCandidateFile = makeUploadCandidateFile({
  repository: supabaseTalentRepository,
  storage: supabaseTalentStorage,
  scanner: cloudmersiveTalentScanner,
  limiters,
  newId: randomUUID,
})

export const deleteCandidateFile = makeDeleteCandidateFile({
  repository: supabaseTalentRepository,
  storage: supabaseTalentStorage,
  limiters,
})

/**
 * ABM de Talent (`/admin/talent`). Sin límites de peticiones: lo usa el
 * personal con sesión de admin, que las Server Actions y la ruta de CVs
 * comprueban antes de llegar aquí.
 */
export const talentAdminQueries = makeTalentAdminQueries({
  admin: supabaseTalentAdminRepository,
})

export const resolveCvLink = makeResolveCvLink({
  admin: supabaseTalentAdminRepository,
  storage: supabaseTalentStorage,
})

export const uploadStaffCv = makeUploadStaffCv({
  admin: supabaseTalentAdminRepository,
  storage: supabaseTalentStorage,
  scanner: cloudmersiveTalentScanner,
  newId: randomUUID,
})

export const processPendingCvs = makeProcessPendingCvs({
  admin: supabaseTalentAdminRepository,
  workflows: n8nTalentWorkflows,
})

export const reprocessCandidate = makeReprocessCandidate({
  admin: supabaseTalentAdminRepository,
  processPendingCvs,
})

export const deleteCandidate = makeDeleteCandidate({
  admin: supabaseTalentAdminRepository,
  storage: supabaseTalentStorage,
})

export { PURGE_MAX_BATCH } from './application/purgeExpiredCandidates'

/** Purga por plazo de conservación: la llama n8n (`/api/talent/purge`). */
export const purgeExpiredCandidates = makePurgeExpiredCandidates({
  admin: supabaseTalentAdminRepository,
  storage: supabaseTalentStorage,
  now: () => new Date(),
  recordAudit: (event) =>
    recordSystemAuditEvent({
      actorEmail: 'system:talent-purge',
      action: event.action,
      entity: 'talent_candidate',
      entityId: event.entityId,
      payload: event.payload,
    }),
})

export const resendFormLink = makeResendFormLink({
  admin: supabaseTalentAdminRepository,
  workflows: n8nTalentWorkflows,
  newToken: randomUUID,
})

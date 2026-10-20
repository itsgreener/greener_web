import 'server-only'

import { randomUUID } from 'node:crypto'

import { createFixedWindowRateLimiter } from '@/lib/rateLimit/inMemoryRateLimiter'

import { makeDeleteCandidateFile } from './application/deleteCandidateFile'
import { makeGetCandidateForm } from './application/getCandidateForm'
import { makeProcessPendingCvs } from './application/processPendingCvs'
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
 * Composition root de talent. Los límites son en memoria del proceso (como
 * los del feed y la newsletter): amortiguan, no son una defensa contra abuso
 * deliberado. Ver `inMemoryRateLimiter.ts`.
 */

const limiters: TalentLimiters = {
  signupByIp: createFixedWindowRateLimiter(TALENT_LIMITS.signupByIp),
  signupByVisitor: createFixedWindowRateLimiter(TALENT_LIMITS.signupByVisitor),
  signupByEmail: createFixedWindowRateLimiter(TALENT_LIMITS.signupByEmail),
  formReadByIp: createFixedWindowRateLimiter(TALENT_LIMITS.formReadByIp),
  formSaveByIp: createFixedWindowRateLimiter(TALENT_LIMITS.formSaveByIp),
  formSaveByToken: createFixedWindowRateLimiter(TALENT_LIMITS.formSaveByToken),
  uploadByIp: createFixedWindowRateLimiter(TALENT_LIMITS.uploadByIp),
  uploadByToken: createFixedWindowRateLimiter(TALENT_LIMITS.uploadByToken),
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

export const resendFormLink = makeResendFormLink({
  admin: supabaseTalentAdminRepository,
  workflows: n8nTalentWorkflows,
  newToken: randomUUID,
})

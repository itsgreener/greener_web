import {
  caseDetailSchema,
  type UpsertCaseDetailInput,
} from '../domain/caseDetailSchema'

import { supabaseCaseDetailRepository } from '../infrastructure/supabaseCaseDetailRepository'

export async function upsertCaseDetail(input: UpsertCaseDetailInput) {
  const validated = caseDetailSchema.parse(input)

  return supabaseCaseDetailRepository.upsert(validated)
}

import {
  caseDetailSchema,
  type UpsertCaseDetailInput,
} from '@/modules/content/domain/caseDetailSchema'
import type { CaseDetailRepository } from '@/modules/content/domain/caseDetailRepository'

export function makeUpsertCaseDetail({
  caseDetails,
}: {
  caseDetails: CaseDetailRepository
}) {
  return async function upsertCaseDetail(input: UpsertCaseDetailInput) {
    const validated = caseDetailSchema.parse(input)

    return caseDetails.upsert(validated)
  }
}

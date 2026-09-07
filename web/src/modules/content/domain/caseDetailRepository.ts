import type { CaseDetail, UpsertCaseDetailInput } from './caseDetailSchema'

export interface CaseDetailRepository {
  getByContentId(contentId: string): Promise<CaseDetail | null>

  upsert(input: UpsertCaseDetailInput): Promise<string>
}

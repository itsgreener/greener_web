import { getPublicCaseDetail as getPublicCaseDetailSource } from '../infrastructure/publicCaseSource'

export async function getPublicCaseDetail(contentId: string) {
  return getPublicCaseDetailSource(contentId)
}

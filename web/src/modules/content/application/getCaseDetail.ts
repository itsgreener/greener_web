import {
  supabaseCaseDetailRepository,
} from '../infrastructure/supabaseCaseDetailRepository'

export async function getCaseDetail(
  contentId: string
) {
  return supabaseCaseDetailRepository
    .getByContentId(contentId)
}
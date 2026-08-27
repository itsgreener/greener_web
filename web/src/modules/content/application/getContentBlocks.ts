import {
  supabaseContentBlockRepository,
} from '../infrastructure/supabaseContentBlockRepository'

export async function getContentBlocks(
  contentId: string
) {
  return supabaseContentBlockRepository
    .listByContentId(
      contentId
    )
}
import { createClient } from '@/lib/supabase/server'

import type {
  CaseCarouselItem,
  CaseCarouselRepository,
} from '../domain/caseCarouselRepository'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

export const supabaseCaseCarouselRepository: CaseCarouselRepository = {
  async listByContentId(contentId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('case_detail_media')
      .select(
        `
        media_id,
        sort_order,
        alt,
        media_asset ( kind, cloudinary_public_id )
      `,
      )
      .eq('content_id', contentId)
      .order('sort_order', { ascending: true })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return (data ?? [])
      .filter((row) => row.media_asset !== null)
      .map((row): CaseCarouselItem => ({
        mediaId: row.media_id,
        kind: row.media_asset!.kind,
        cloudinaryPublicId: row.media_asset!.cloudinary_public_id,
        sortOrder: row.sort_order,
        alt: row.alt,
      }))
  },
}

import { createClient } from '@/lib/supabase/server'

import type {
  CaseCarouselItem,
  CaseCarouselRepository,
} from '../domain/caseCarouselRepository'

function createRepositoryError(message: string, code?: string) {
  const error = new Error(message) as Error & {
    code?: string
  }

  error.code = code

  return error
}

type SupabaseCaseCarouselRow = {
  media_id: string
  sort_order: number
  media_asset: {
    kind: 'image' | 'video'
    cloudinary_public_id: string
  } | null
}

export const supabaseCaseCarouselRepository: CaseCarouselRepository = {
  async listByContentId(contentId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('case_detail_media')
      .select(
        `
        media_id,
        sort_order,
        media_asset ( kind, cloudinary_public_id )
      `,
      )
      .eq('content_id', contentId)
      .order('sort_order', { ascending: true })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return ((data ?? []) as unknown as SupabaseCaseCarouselRow[])
      .filter((row) => row.media_asset !== null)
      .map((row): CaseCarouselItem => ({
        mediaId: row.media_id,
        kind: row.media_asset!.kind,
        cloudinaryPublicId: row.media_asset!.cloudinary_public_id,
        sortOrder: row.sort_order,
      }))
  },
}

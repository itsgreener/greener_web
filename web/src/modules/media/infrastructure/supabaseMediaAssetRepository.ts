import { createClient } from '@/lib/supabase/server'

import type { MediaAssetRepository } from '../domain/mediaAssetRepository'

import type {
  AddCaseCarouselImageInput,
  AddCaseCarouselVideoInput,
  DeleteCoverMediaInput,
  RegisterCoverImageInput,
  RegisterCoverVideoInput,
  RemoveCaseCarouselMediaInput,
} from '../domain/mediaAssetSchema'

function createRepositoryError(message: string, code?: string) {
  const error = new Error(message) as Error & {
    code?: string
  }

  error.code = code

  return error
}

export const supabaseMediaAssetRepository: MediaAssetRepository = {
  async registerCoverImage(input: RegisterCoverImageInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('register_cover_image', {
      p_content_id: input.contentId,

      p_cloudinary_public_id: input.cloudinaryPublicId,

      p_format: input.format,

      p_width: input.width,

      p_height: input.height,

      p_bytes: input.bytes,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async registerCoverVideo(input: RegisterCoverVideoInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('register_cover_video', {
      p_content_id: input.contentId,

      p_cloudinary_public_id: input.cloudinaryPublicId,

      p_format: input.format,

      p_width: input.width,

      p_height: input.height,

      p_duration_seconds: input.durationSeconds,

      p_bytes: input.bytes,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async unlinkAndDeleteCoverMedia(input: DeleteCoverMediaInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc(
      'unlink_and_delete_cover_media',
      {
        p_content_id: input.contentId,

        p_media_id: input.mediaId,
      },
    )

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async addCaseCarouselImage(input: AddCaseCarouselImageInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('add_case_carousel_image', {
      p_content_id: input.contentId,

      p_cloudinary_public_id: input.cloudinaryPublicId,

      p_format: input.format,

      p_width: input.width,

      p_height: input.height,

      p_bytes: input.bytes,

      p_sort_order: input.sortOrder,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async addCaseCarouselVideo(input: AddCaseCarouselVideoInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('add_case_carousel_video', {
      p_content_id: input.contentId,

      p_cloudinary_public_id: input.cloudinaryPublicId,

      p_format: input.format,

      p_width: input.width,

      p_height: input.height,

      p_duration_seconds: input.durationSeconds,

      p_bytes: input.bytes,

      p_sort_order: input.sortOrder,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async removeCaseCarouselMedia(input: RemoveCaseCarouselMediaInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('remove_case_carousel_media', {
      p_content_id: input.contentId,

      p_media_id: input.mediaId,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },
}

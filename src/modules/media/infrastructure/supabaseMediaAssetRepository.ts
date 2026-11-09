import { createClient } from '@/lib/supabase/server'

import type {
  MediaAssetRepository,
  ReplaceCaseCarouselMediaInput,
} from '@/modules/media/domain/mediaAssetRepository'

import type {
  AddCaseCarouselImageInput,
  AddCaseCarouselVideoInput,
  RemoveCaseCarouselMediaInput,
  ReorderCaseCarouselInput,
  UpdateCaseCarouselAltInput,
} from '@/modules/media/domain/mediaAssetSchema'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

export const supabaseMediaAssetRepository: MediaAssetRepository = {
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

      p_alt: input.alt,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
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

      p_alt: input.alt,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
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

    return data
  },

  async replaceCaseCarouselMedia(input: ReplaceCaseCarouselMediaInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('replace_case_carousel_media', {
      p_content_id: input.contentId,

      p_media_id: input.mediaId,

      p_kind: input.kind,

      p_cloudinary_public_id: input.cloudinaryPublicId,

      p_format: input.format,

      p_width: input.width,

      p_height: input.height,

      p_bytes: input.bytes,

      p_alt: input.alt,

      // Solo los vídeos la llevan; en una imagen la función la ignora.
      p_duration_seconds:
        input.kind === 'video' ? input.durationSeconds : undefined,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async updateCaseCarouselAlt(input: UpdateCaseCarouselAltInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('update_case_carousel_alt', {
      p_content_id: input.contentId,

      p_media_id: input.mediaId,

      p_alt: input.alt,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async reorderCaseCarousel(input: ReorderCaseCarouselInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('reorder_case_carousel', {
      p_content_id: input.contentId,

      p_media_ids: input.mediaIds,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },
}

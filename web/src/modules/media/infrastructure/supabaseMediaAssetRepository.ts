import { createClient } from '@/lib/supabase/server'

import type { MediaAssetRepository } from '../domain/mediaAssetRepository'

import type {
  DeleteBlockMediaInput,
  RegisterImageForBlockInput,
  RegisterVideoForBlockInput,
} from '../domain/mediaAssetSchema'

function createRepositoryError(message: string, code?: string) {
  const error = new Error(message) as Error & {
    code?: string
  }

  error.code = code

  return error
}

export const supabaseMediaAssetRepository: MediaAssetRepository = {
  async registerImageForBlock(input: RegisterImageForBlockInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('register_image_for_block', {
      p_block_id: input.blockId,

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

  async registerVideoForBlock(input: RegisterVideoForBlockInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('register_video_for_block', {
      p_block_id: input.blockId,

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

  async unlinkAndDelete(input: DeleteBlockMediaInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc(
      'unlink_and_delete_media_asset',
      {
        p_block_id: input.blockId,

        p_media_id: input.mediaId,
      },
    )

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },
}

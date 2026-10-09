import { createClient } from '@/lib/supabase/server'

import type { PinMediaRepository } from '../domain/pinMediaRepository'
import type {
  AttachPinImageInput,
  AttachPinVideoInput,
  DetachPinMediaInput,
} from '../domain/pinMediaSchema'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

export const supabasePinMediaRepository: PinMediaRepository = {
  async attachImage(input: AttachPinImageInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('attach_pin_image', {
      p_pin_id: input.pinId,
      p_cloudinary_public_id: input.cloudinaryPublicId,
      p_format: input.format ?? null,
      p_width: input.width,
      p_height: input.height,
      p_bytes: input.bytes,
      p_slide_order: 0,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async attachVideo(input: AttachPinVideoInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('attach_pin_video', {
      p_pin_id: input.pinId,
      p_cloudinary_public_id: input.cloudinaryPublicId,
      p_format: input.format ?? null,
      p_width: input.width,
      p_height: input.height,
      p_duration_seconds: input.durationSeconds,
      p_bytes: input.bytes,
      p_slide_order: 0,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async detach(input: DetachPinMediaInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('detach_pin_media', {
      p_pin_id: input.pinId,
      p_media_id: input.mediaId,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },
}

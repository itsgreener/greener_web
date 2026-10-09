import { createClient } from '@/lib/supabase/server'

import type { PinRepository, PinListItem } from '../domain/pinRepository'
import type {
  CreatePinInput,
  DeletePinInput,
  UpdatePinInput,
} from '../domain/pinSchema'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

type SupabasePinRow = {
  id: string
  content_id: string
  ratio: string
  label: string | null
  language: string
  autoplay_mode: PinListItem['autoplayMode']
  alt: string
  created_at: string
  pin_media: Array<{
    media_id: string
    slide_order: number
    media_asset: {
      kind: 'image' | 'video'
      cloudinary_public_id: string
    } | null
  }>
}

function mapPin(row: SupabasePinRow): PinListItem {
  return {
    id: row.id,
    contentId: row.content_id,
    ratio: row.ratio,
    label: row.label,
    language: row.language,
    autoplayMode: row.autoplay_mode,
    alt: row.alt,
    createdAt: row.created_at,
    media: row.pin_media
      .filter((pm) => pm.media_asset !== null)
      .map((pm) => ({
        id: pm.media_id,
        kind: pm.media_asset!.kind,
        cloudinaryPublicId: pm.media_asset!.cloudinary_public_id,
        slideOrder: pm.slide_order,
      }))
      .sort((a, b) => a.slideOrder - b.slideOrder),
  }
}

export const supabasePinRepository: PinRepository = {
  async listByContentId(contentId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pin')
      .select(
        `
        id,
        content_id,
        ratio,
        label,
        language,
        autoplay_mode,
        alt,
        created_at,
        pin_media (
          media_id,
          slide_order,
          media_asset ( kind, cloudinary_public_id )
        )
      `,
      )
      .eq('content_id', contentId)
      .order('queue_order', { ascending: true })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data.map(mapPin)
  },

  async create(input: CreatePinInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('create_pin', {
      p_content_id: input.contentId,
      p_ratio: input.ratio,
      p_label: input.label ?? null,
      p_language: input.language,
      p_autoplay_mode: input.autoplayMode ?? null,
      p_alt: input.alt,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async update(input: UpdatePinInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('update_pin', {
      p_pin_id: input.id,
      p_ratio: input.ratio,
      p_label: input.label ?? null,
      p_language: input.language,
      p_autoplay_mode: input.autoplayMode ?? null,
      p_alt: input.alt,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async delete(input: DeletePinInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('delete_pin', {
      p_pin_id: input.id,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },
}

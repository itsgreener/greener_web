import { createClient } from '@/lib/supabase/server'

import type {
  ContentDetail,
  ContentListItem,
  ContentRepository,
} from '../domain/contentRepository'

import type {
  CreateContentInput,
  DeleteContentInput,
  Locale,
  PublishContentInput,
  ScheduleContentInput,
  UnpublishContentInput,
  UpdateContentInput,
} from '../domain/contentSchema'

type SupabaseContentRow = {
  id: string
  type: ContentListItem['type']
  status: ContentListItem['status']
  slug: string
  default_locale: Locale
  created_at: string
  publish_at: string | null
  cover_media_id: string | null

  translations: Array<{
    locale: Locale
    title: string
  }>

  cover_media: {
    kind: 'image' | 'video'
    cloudinary_public_id: string
  } | null
}

function mapContent(row: SupabaseContentRow): ContentDetail {
  const translation = row.translations.find(
    (item) => item.locale === row.default_locale,
  )

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    slug: row.slug,
    defaultLocale: row.default_locale,
    title: translation?.title ?? '',
    createdAt: row.created_at,
    publishAt: row.publish_at,
    coverMedia:
      row.cover_media_id && row.cover_media
        ? {
            id: row.cover_media_id,
            kind: row.cover_media.kind,
            cloudinaryPublicId: row.cover_media.cloudinary_public_id,
          }
        : null,
  }
}

function createRepositoryError(message: string, code?: string) {
  const error = new Error(message) as Error & {
    code?: string
  }

  error.code = code

  return error
}

export const supabaseContentRepository: ContentRepository = {
  async list() {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('content')
      .select(
        `
        id,
        type,
        status,
        slug,
        default_locale,
        created_at,
        publish_at,
        cover_media_id,
        translations:content_translation (
          locale,
          title
        ),
        cover_media:media_asset!cover_media_id (
          kind,
          cloudinary_public_id
        )
      `,
      )
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    const rows = (data ?? []) as unknown as SupabaseContentRow[]

    return rows.map(mapContent)
  },

  async getById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('content')
      .select(
        `
        id,
        type,
        status,
        slug,
        default_locale,
        created_at,
        publish_at,
        cover_media_id,
        translations:content_translation (
          locale,
          title
        ),
        cover_media:media_asset!cover_media_id (
          kind,
          cloudinary_public_id
        )
      `,
      )
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    if (!data) {
      return null
    }

    return mapContent(data as unknown as SupabaseContentRow)
  },

  async createDraft(input: CreateContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('create_content_draft', {
      p_type: input.type,

      p_slug: input.slug,

      p_default_locale: input.defaultLocale,

      p_title: input.title,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async update(input: UpdateContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('update_content', {
      p_content_id: input.id,

      p_slug: input.slug,

      p_default_locale: input.defaultLocale,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async delete(input: DeleteContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('delete_content', {
      p_content_id: input.id,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async publish(input: PublishContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('publish_content', {
      p_content_id: input.id,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async schedule(input: ScheduleContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('schedule_content', {
      p_content_id: input.id,

      p_publish_at: input.publishAt.toISOString(),
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async unpublish(input: UnpublishContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('unpublish_content', {
      p_content_id: input.id,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },
}

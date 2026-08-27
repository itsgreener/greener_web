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
  UpdateContentInput,
} from '../domain/contentSchema'

type SupabaseContentRow = {
  id: string
  type: ContentListItem['type']
  status: ContentListItem['status']
  slug: string
  default_locale: Locale
  created_at: string

  translations: Array<{
    locale: Locale
    title: string
  }>
}

function mapContent(
  row: SupabaseContentRow
): ContentDetail {
  const translation =
    row.translations.find(
      (item) =>
        item.locale ===
        row.default_locale
    )

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    slug: row.slug,
    defaultLocale:
      row.default_locale,
    title:
      translation?.title ?? '',
    createdAt:
      row.created_at,
  }
}

function createRepositoryError(
  message: string,
  code?: string
) {
  const error =
    new Error(
      message
    ) as Error & {
      code?: string
    }

  error.code = code

  return error
}

export const supabaseContentRepository:
  ContentRepository = {

  async list() {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase
      .from('content')
      .select(`
        id,
        type,
        status,
        slug,
        default_locale,
        created_at,
        translations:content_translation (
          locale,
          title
        )
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    const rows =
      (data ?? []) as
        SupabaseContentRow[]

    return rows.map(
      mapContent
    )
  },

  async getById(
    id: string
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase
      .from('content')
      .select(`
        id,
        type,
        status,
        slug,
        default_locale,
        created_at,
        translations:content_translation (
          locale,
          title
        )
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    if (!data) {
      return null
    }

    return mapContent(
      data as
        SupabaseContentRow
    )
  },

  async createDraft(
    input:
      CreateContentInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'create_content_draft',
      {
        p_type:
          input.type,

        p_slug:
          input.slug,

        p_default_locale:
          input.defaultLocale,

        p_title:
          input.title,
      }
    )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    return data as string
  },

  async update(
    input:
      UpdateContentInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'update_content',
      {
        p_content_id:
          input.id,

        p_slug:
          input.slug,

        p_default_locale:
          input.defaultLocale,
      }
    )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    return data as string
  },

  async delete(
    input:
      DeleteContentInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'delete_content',
      {
        p_content_id:
          input.id,
      }
    )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    return data as string
  },
}
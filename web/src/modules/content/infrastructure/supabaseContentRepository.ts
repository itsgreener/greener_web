import { createClient } from '@/lib/supabase/server'

import type {
  ContentListItem,
  ContentRepository,
} from '../domain/contentRepository'

import type {
  CreateContentInput,
  Locale,
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

export const supabaseContentRepository:
  ContentRepository = {

  async list() {
    const supabase = await createClient()

    const { data, error } = await supabase
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
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      throw new Error(error.message)
    }

    const rows =
      (data ?? []) as SupabaseContentRow[]

    return rows.map((row) => {
      const translation =
        row.translations.find(
          (item) =>
            item.locale === row.default_locale
        )

      return {
        id: row.id,
        type: row.type,
        status: row.status,
        slug: row.slug,
        defaultLocale: row.default_locale,
        title: translation?.title ?? '—',
        createdAt: row.created_at,
      }
    })
  },

  async createDraft(
    input: CreateContentInput
  ) {
    const supabase = await createClient()

    const { data, error } =
      await supabase.rpc(
        'create_content_draft',
        {
          p_type: input.type,
          p_slug: input.slug,
          p_default_locale:
            input.defaultLocale,
          p_title: input.title,
        }
      )

    if (error) {
      const repositoryError =
        new Error(error.message) as Error & {
          code?: string
        }

      repositoryError.code = error.code

      throw repositoryError
    }

    return data as string
  },
}
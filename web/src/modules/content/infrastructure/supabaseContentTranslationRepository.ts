import {
  createClient,
} from '@/lib/supabase/server'

import type {
  ContentTranslationRepository,
} from '../domain/contentTranslationRepository'

import type {
  ContentTranslation,
  UpsertContentTranslationInput,
} from '../domain/contentTranslationSchema'

import type {
  Locale,
} from '../domain/contentSchema'

type SupabaseTranslationRow = {
  content_id: string
  locale: Locale
  title: string
  seo_title: string | null
  seo_description:
    string | null
  summary: string | null
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

function mapTranslation(
  row:
    SupabaseTranslationRow
): ContentTranslation {
  return {
    contentId:
      row.content_id,

    locale:
      row.locale,

    title:
      row.title,

    seoTitle:
      row.seo_title,

    seoDescription:
      row.seo_description,

    summary:
      row.summary,
  }
}

export const supabaseContentTranslationRepository:
  ContentTranslationRepository = {

  async listByContentId(
    contentId: string
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase
      .from(
        'content_translation'
      )
      .select(`
        content_id,
        locale,
        title,
        seo_title,
        seo_description,
        summary
      `)
      .eq(
        'content_id',
        contentId
      )

    if (error) {
      throw createRepositoryError(
        error.message,
        error.code
      )
    }

    return (
      (data ?? []) as
        SupabaseTranslationRow[]
    ).map(
      mapTranslation
    )
  },

  async upsert(
    input:
      UpsertContentTranslationInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'upsert_content_translation',
      {
        p_content_id:
          input.contentId,

        p_locale:
          input.locale,

        p_title:
          input.title,

        p_seo_title:
          input.seoTitle,

        p_seo_description:
          input.seoDescription,

        p_summary:
          input.summary,
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
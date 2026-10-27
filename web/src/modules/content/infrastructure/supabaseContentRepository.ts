import { createClient } from '@/lib/supabase/server'

import type {
  ContentCounts,
  ContentDetail,
  ContentListItem,
  ContentRepository,
} from '@/modules/content/domain/contentRepository'
import { contentStatusSchema } from '@/modules/shared/domain/contentStatus'

import type {
  CreateContentInput,
  DeleteContentInput,
  PublishContentInput,
  ScheduleContentInput,
  UnpublishContentInput,
  UpdateContentInput,
} from '@/modules/content/domain/contentSchema'
import type { Locale } from '@/modules/shared/domain/locale'
import type { OtherKind } from '@/modules/content/domain/otherSchema'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

type SupabaseContentRow = {
  id: string
  type: ContentListItem['type']
  status: ContentListItem['status']
  slug: string
  default_locale: Locale
  created_at: string
  publish_at: string | null

  translations: Array<{
    locale: Locale
    title: string
  }>

  other_detail?: { kind: OtherKind } | null
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
  }
}

type SupabaseListRow = Pick<
  SupabaseContentRow,
  | 'id'
  | 'type'
  | 'status'
  | 'slug'
  | 'default_locale'
  | 'created_at'
  | 'publish_at'
  | 'translations'
  | 'other_detail'
>

function mapListItem(row: SupabaseListRow): ContentListItem {
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

    otherKind: row.other_detail?.kind ?? null,
  }
}

export const supabaseContentRepository: ContentRepository = {
  async list(query) {
    const supabase = await createClient()
    const pattern = `%${query.q}%`

    // El título vive en content_translation: se buscan primero los
    // contenidos cuyo título (en cualquier idioma) coincide y se combina con
    // el slug en un único `or`.
    let titleMatchIds: string[] = []

    if (query.q) {
      const { data, error } = await supabase
        .from('content_translation')
        .select('content_id')
        .ilike('title', pattern)
        .limit(500)

      if (error) {
        throw createRepositoryError(error.message, error.code)
      }

      titleMatchIds = [...new Set((data ?? []).map((row) => row.content_id))]
    }

    let request = supabase
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
        translations:content_translation (
          locale,
          title
        ),
        other_detail (
          kind
        )
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1)

    if (query.type) request = request.eq('type', query.type)

    if (query.status) request = request.eq('status', query.status)

    if (query.q) {
      const conditions = [`slug.ilike.${pattern}`]

      if (titleMatchIds.length > 0) {
        conditions.push(`id.in.(${titleMatchIds.join(',')})`)
      }

      request = request.or(conditions.join(','))
    }

    const { data, error, count } = await request

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return {
      items: (data ?? []).map(mapListItem),
      total: count ?? 0,
    }
  },

  async counts() {
    const supabase = await createClient()

    const entries = await Promise.all(
      contentStatusSchema.options.map(async (status) => {
        const { count, error } = await supabase
          .from('content')
          .select('id', { count: 'exact', head: true })
          .eq('status', status)

        if (error) {
          throw createRepositoryError(error.message, error.code)
        }

        return [status, count ?? 0] as const
      }),
    )

    return Object.fromEntries(entries) as ContentCounts
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
        translations:content_translation (
          locale,
          title
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

    return mapContent(data)
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

    return data
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

    return data
  },

  async delete(input: DeleteContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('delete_content', {
      p_content_id: input.id,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async publish(input: PublishContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('publish_content', {
      p_content_id: input.id,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
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

    return data
  },

  async unpublish(input: UnpublishContentInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('unpublish_content', {
      p_content_id: input.id,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },
}

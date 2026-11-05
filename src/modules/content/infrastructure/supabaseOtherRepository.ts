import { createClient } from '@/lib/supabase/server'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

import type { OtherRepository } from '@/modules/content/domain/otherRepository'

export const supabaseOtherRepository: OtherRepository = {
  async getByContentId(contentId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('other_detail')
      .select('content_id, kind, frequency')
      .eq('content_id', contentId)
      .maybeSingle()

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    if (!data) {
      return null
    }

    return {
      contentId: data.content_id,

      kind: data.kind,

      frequency: data.frequency,
    }
  },

  async listPublishedFrequencies(excludeContentId) {
    const supabase = await createClient()

    // `!inner` + filtro sobre la tabla unida: solo los `other` publicados
    // (el admin ve también borradores y programados).
    let request = supabase
      .from('other_detail')
      .select('content_id, frequency, content!inner(status)')
      .eq('content.status', 'published')

    if (excludeContentId) {
      request = request.neq('content_id', excludeContentId)
    }

    const { data, error } = await request

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return (data ?? []).map((row) => row.frequency)
  },

  async createDraft(input) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('create_other_draft', {
      p_slug: input.slug,

      p_default_locale: input.defaultLocale,

      p_title: input.title,

      p_kind: input.kind,

      p_frequency: input.frequency,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },

  async updateFrequency(input) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('update_other_frequency', {
      p_content_id: input.contentId,

      p_frequency: input.frequency,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data
  },
}

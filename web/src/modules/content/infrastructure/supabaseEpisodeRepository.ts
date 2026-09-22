import { createClient } from '@/lib/supabase/server'

import type { EpisodeRepository } from '../domain/episodeRepository'

import type { Episode, UpsertEpisodeInput } from '../domain/episodeSchema'

type SupabaseEpisodeRow = {
  content_id: string
  program: Episode['program']
  number: number | null
  guest: string | null
  role: string | null
  company: string | null
  episode_date: string | null
  duration_seconds: number | null
  provider: Episode['provider']
  embed_id: string
  language: Episode['language']
  episode_kind: Episode['episodeKind']
}

function createRepositoryError(message: string, code?: string) {
  const error = new Error(message) as Error & {
    code?: string
  }

  error.code = code

  return error
}

function mapEpisode(row: SupabaseEpisodeRow): Episode {
  return {
    contentId: row.content_id,

    program: row.program,

    number: row.number,

    guest: row.guest,

    role: row.role,

    company: row.company,

    episodeDate: row.episode_date,

    durationSeconds: row.duration_seconds,

    provider: row.provider,

    embedId: row.embed_id,

    language: row.language,

    episodeKind: row.episode_kind,
  }
}

export const supabaseEpisodeRepository: EpisodeRepository = {
  async getByContentId(contentId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('episode')
      .select(
        `
        content_id,
        program,
        number,
        guest,
        role,
        company,
        episode_date,
        duration_seconds,
        provider,
        embed_id,
        language,
        episode_kind
      `,
      )
      .eq('content_id', contentId)
      .maybeSingle()

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    if (!data) {
      return null
    }

    return mapEpisode(data as SupabaseEpisodeRow)
  },

  async upsert(input: UpsertEpisodeInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('upsert_episode', {
      p_content_id: input.contentId,

      p_program: input.program,

      p_number: input.number,

      p_guest: input.guest,

      p_role: input.role,

      p_company: input.company,

      p_episode_date: input.episodeDate,

      p_duration_seconds: input.durationSeconds,

      p_provider: input.provider,

      p_embed_id: input.embedId,

      p_language: input.language,

      p_episode_kind: input.episodeKind,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },
}

import { createClient } from '@/lib/supabase/server'

import type { EpisodeRepository } from '@/modules/content/domain/episodeRepository'

import {
  episodeProviderSchema,
  type Episode,
  type UpsertEpisodeInput,
} from '@/modules/content/domain/episodeSchema'
import { createRepositoryError } from '@/lib/supabase/repositoryError'

type SupabaseEpisodeRow = {
  content_id: string
  program: Episode['program']
  number: number | null
  guest: string | null
  role: string | null
  company: string | null
  episode_date: string | null
  duration_seconds: number | null
  provider: 'youtube' | 'vimeo' | 'spotify'
  embed_id: string
  language: Episode['language']
  episode_kind: Episode['episodeKind']
}

function mapEpisode(row: SupabaseEpisodeRow): Episode {
  const provider = episodeProviderSchema.safeParse(row.provider)

  if (!provider.success) {
    // Vimeo se retiró (13 oct 2026) pero sigue en el enum de la BBDD.
    throw new Error(
      `El episodio ${row.content_id} usa el proveedor «${row.provider}», que ya no se admite. Cámbialo a youtube o spotify (con su embed_id) desde SQL.`,
    )
  }

  return {
    contentId: row.content_id,

    program: row.program,

    number: row.number,

    guest: row.guest,

    role: row.role,

    company: row.company,

    episodeDate: row.episode_date,

    durationSeconds: row.duration_seconds,

    provider: provider.data,

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

    return mapEpisode(data)
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

    return data
  },
}

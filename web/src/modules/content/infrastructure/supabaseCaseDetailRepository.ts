import { createClient } from '@/lib/supabase/server'

import type { CaseDetailRepository } from '../domain/caseDetailRepository'

import type {
  CaseDetail,
  UpsertCaseDetailInput,
} from '../domain/caseDetailSchema'

type SupabaseCaseDetailRow = {
  content_id: string
  force: number
  client: string | null
}

function createRepositoryError(message: string, code?: string) {
  const error = new Error(message) as Error & {
    code?: string
  }

  error.code = code

  return error
}

function mapCaseDetail(row: SupabaseCaseDetailRow): CaseDetail {
  return {
    contentId: row.content_id,

    force: row.force,

    client: row.client,
  }
}

export const supabaseCaseDetailRepository: CaseDetailRepository = {
  async getByContentId(contentId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('case_detail')
      .select(
        `
        content_id,
        force,
        client
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

    return mapCaseDetail(data as SupabaseCaseDetailRow)
  },

  async upsert(input: UpsertCaseDetailInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('upsert_case_detail', {
      p_content_id: input.contentId,

      p_force: input.force,

      p_client: input.client,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },
}

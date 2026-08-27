import {
  createClient,
} from '@/lib/supabase/server'

import type {
  CaseDetailRepository,
} from '../domain/caseDetailRepository'

import type {
  CaseDetail,
  CaseTemplateVariant,
  UpsertCaseDetailInput,
} from '../domain/caseDetailSchema'

type SupabaseCaseDetailRow = {
  content_id: string
  template_variant:
    CaseTemplateVariant
  force: number
  client: string | null
  sector: string | null
  services: string | null
  year: number | null
  credits: unknown
  links: unknown
}

function createRepositoryError(
  message: string,
  code?: string
) {
  const error =
    new Error(message) as Error & {
      code?: string
    }

  error.code = code

  return error
}

function normalizeJsonArray(
  value: unknown
): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  return []
}

function mapCaseDetail(
  row: SupabaseCaseDetailRow
): CaseDetail {
  return {
    contentId:
      row.content_id,

    templateVariant:
      row.template_variant,

    force:
      row.force,

    client:
      row.client,

    sector:
      row.sector,

    services:
      row.services,

    year:
      row.year,

    credits:
      normalizeJsonArray(
        row.credits
      ),

    links:
      normalizeJsonArray(
        row.links
      ),
  }
}

export const supabaseCaseDetailRepository:
  CaseDetailRepository = {

  async getByContentId(
    contentId: string
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase
      .from('case_detail')
      .select(`
        content_id,
        template_variant,
        force,
        client,
        sector,
        services,
        year,
        credits,
        links
      `)
      .eq(
        'content_id',
        contentId
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

    return mapCaseDetail(
      data as SupabaseCaseDetailRow
    )
  },

  async upsert(
    input: UpsertCaseDetailInput
  ) {
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'upsert_case_detail',
      {
        p_content_id:
          input.contentId,

        p_template_variant:
          input.templateVariant,

        p_force:
          input.force,

        p_client:
          input.client,

        p_sector:
          input.sector,

        p_services:
          input.services,

        p_year:
          input.year,

        p_credits:
          input.credits,

        p_links:
          input.links,
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
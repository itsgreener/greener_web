import 'server-only'

import {
  CANDIDATE_STATUS_FILTER_VALUES,
  CANDIDATE_STATUS_REPROCESSABLE,
  CV_UPLOAD_PREFIX,
} from '@/modules/talent/domain/talentConstants'
import type {
  CandidateDetail,
  CandidateFileDetail,
  CandidateListItem,
} from '@/modules/talent/domain/talentAdminModels'
import { classifyCvLocation } from '@/modules/talent/domain/talentCvLocation'
import type { CandidateProject } from '@/modules/talent/domain/talentModels'
import type { TalentAdminRepository } from '@/modules/talent/domain/talentPorts'

import { getTalentClient } from './talentSupabaseClient'

/**
 * Columnas del listado y de la ficha. **Sin `access_token`**: el personal no
 * lo necesita y no debe llegar a una página del ABM. Fijadas a mano porque
 * Supabase-talent no tiene tipos generados (es otro proyecto, con el esquema
 * que ya usa n8n).
 */
const LIST_COLUMNS =
  'id,name,email,status,profile,file_path,uploaded_by,created_at'

const DETAIL_COLUMNS =
  'id,created_at,status,name,email,phone,comment,ai_comment,profile,experience,work_types,rate_day,rate_hour,languages,socials,newsletter_accepted,uploaded_by,blocked,file_path,file_name'

type ListRow = {
  id: string
  name: string | null
  email: string | null
  status: string
  profile: string[] | null
  file_path: string | null
  uploaded_by: string | null
  created_at: string | null
}

type DetailRow = ListRow & {
  phone: string | null
  comment: string | null
  ai_comment: string | null
  experience: string | null
  work_types: string[] | null
  rate_day: number | null
  rate_hour: number | null
  languages: Record<string, string> | null
  socials: Record<string, string> | null
  newsletter_accepted: boolean | null
  blocked: boolean | null
  file_name: string | null
}

type FileRow = {
  id: string
  type: string | null
  path: string | null
  status: string | null
  created_at: string | null
}

function fail(operation: string, error: { message: string }): never {
  throw new Error(`Supabase-talent (${operation}): ${error.message}`)
}

export const supabaseTalentAdminRepository: TalentAdminRepository = {
  async search(query) {
    const client = getTalentClient()

    let request = client
      .from('candidates')
      .select(LIST_COLUMNS, { count: 'exact' })

    // `q` ya viene saneada (`parseCandidateSearchQuery` quita `% _ * , ( ) " \`).
    if (query.q) {
      request = request.or(`name.ilike.%${query.q}%,email.ilike.%${query.q}%`)
    }

    if (query.status) request = request.eq('status', query.status)

    if (query.profile) request = request.contains('profile', [query.profile])

    const from = (query.page - 1) * query.pageSize

    const { data, error, count } = await request
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(from, from + query.pageSize - 1)

    if (error) fail('candidates.search', error)

    const rows = (data ?? []) as ListRow[]
    const filesCount = new Map<string, number>()

    if (rows.length > 0) {
      // Sin `files(...)` embebido: no se sabe si hay clave foránea declarada.
      const files = await client
        .from('files')
        .select('candidate_id')
        .in(
          'candidate_id',
          rows.map((row) => row.id),
        )

      if (files.error) fail('files.count', files.error)

      for (const file of (files.data ?? []) as { candidate_id: string }[]) {
        filesCount.set(
          file.candidate_id,
          (filesCount.get(file.candidate_id) ?? 0) + 1,
        )
      }
    }

    const items: CandidateListItem[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      profile: row.profile ?? [],
      cvKind: classifyCvLocation(row.file_path),
      filesCount: filesCount.get(row.id) ?? 0,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
    }))

    return { items, total: count ?? items.length }
  },

  async findDetail(candidateId) {
    const client = getTalentClient()

    const { data, error } = await client
      .from('candidates')
      .select(DETAIL_COLUMNS)
      .eq('id', candidateId)
      .limit(1)

    if (error) fail('candidates.findDetail', error)

    const row = (data as DetailRow[] | null)?.[0]

    if (!row) return null

    const [projects, files] = await Promise.all([
      client
        .from('projects')
        .select('link,comment')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: true }),
      client
        .from('files')
        .select('id,type,path,status,created_at')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: true }),
    ])

    if (projects.error) fail('projects.select', projects.error)

    if (files.error) fail('files.select', files.error)

    const detail: CandidateDetail = {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      name: row.name,
      email: row.email,
      phone: row.phone,
      comment: row.comment,
      aiComment: row.ai_comment,
      profile: row.profile ?? [],
      experience: row.experience,
      workTypes: row.work_types ?? [],
      rateDay: row.rate_day,
      rateHour: row.rate_hour,
      languages: row.languages ?? {},
      socials: row.socials ?? {},
      newsletterAccepted: row.newsletter_accepted,
      uploadedBy: row.uploaded_by,
      blocked: row.blocked,
      cvKind: classifyCvLocation(row.file_path),
      cvName: row.file_name,
      projects: (projects.data ?? []) as CandidateProject[],
      files: ((files.data ?? []) as FileRow[]).map(
        (file): CandidateFileDetail => ({
          id: file.id,
          type: file.type,
          status: file.status,
          kind: classifyCvLocation(file.path),
          createdAt: file.created_at,
        }),
      ),
    }

    return detail
  },

  /**
   * Un recuento por estado (`head: true`, sin filas): traer todas las filas
   * toparía con el máximo de 1.000 de la API de Supabase y hay más de 1.000
   * candidatos.
   */
  async countByStatus() {
    const client = getTalentClient()

    const counts = await Promise.all(
      CANDIDATE_STATUS_FILTER_VALUES.map(async (status) => {
        const { count, error } = await client
          .from('candidates')
          .select('id', { count: 'exact', head: true })
          .eq('status', status)

        if (error) fail('candidates.countByStatus', error)

        return [status, count ?? 0] as const
      }),
    )

    return Object.fromEntries(counts)
  },

  async findStoredPath(candidateId, fileId) {
    const client = getTalentClient()

    if (fileId) {
      const { data, error } = await client
        .from('files')
        .select('path')
        .eq('id', fileId)
        .eq('candidate_id', candidateId)
        .limit(1)

      if (error) fail('files.findStoredPath', error)

      return (data as { path: string | null }[] | null)?.[0]?.path ?? null
    }

    const { data, error } = await client
      .from('candidates')
      .select('file_path')
      .eq('id', candidateId)
      .limit(1)

    if (error) fail('candidates.findStoredPath', error)

    return (
      (data as { file_path: string | null }[] | null)?.[0]?.file_path ?? null
    )
  },

  async insertStaffCandidate(row) {
    const { data, error } = await getTalentClient()
      .from('candidates')
      .insert(row)
      .select('id')
      .single()

    if (error) fail('candidates.insertStaff', error)

    return { id: (data as { id: string }).id }
  },

  async requeueForProcessing(candidateId) {
    const { data, error } = await getTalentClient()
      .from('candidates')
      .update({ status: 'pending' })
      .eq('id', candidateId)
      .in('status', [...CANDIDATE_STATUS_REPROCESSABLE])
      .like('file_path', `${CV_UPLOAD_PREFIX}%`)
      .select('id')

    if (error) fail('candidates.requeue', error)

    return ((data as { id: string }[] | null) ?? []).length > 0
  },

  async findAccessById(candidateId) {
    const { data, error } = await getTalentClient()
      .from('candidates')
      .select('id,email,status,access_token')
      .eq('id', candidateId)
      .limit(1)

    if (error) fail('candidates.findAccessById', error)

    const row = (
      data as
        | {
            id: string
            email: string | null
            status: string
            access_token: string | null
          }[]
        | null
    )?.[0]

    return row
      ? {
          id: row.id,
          email: row.email,
          status: row.status,
          accessToken: row.access_token,
        }
      : null
  },

  async setAccessToken(candidateId, accessToken) {
    const { error } = await getTalentClient()
      .from('candidates')
      .update({ access_token: accessToken })
      .eq('id', candidateId)

    if (error) fail('candidates.setAccessToken', error)
  },
}

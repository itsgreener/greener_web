import 'server-only'

import { DuplicateCandidateEmailError } from '@/modules/talent/domain/talentErrors'
import type {
  CandidateAccess,
  CandidateFileRecord,
  CandidateFormRecord,
  CandidateProject,
} from '@/modules/talent/domain/talentModels'
import type { TalentRepository } from '@/modules/talent/domain/talentPorts'

import { getTalentClient } from './talentSupabaseClient'

/** `candidates` no declara claves foráneas conocidas: se lee por tablas. */
const FORM_COLUMNS =
  'id,email,name,phone,comment,profile,experience,work_types,rate_day,rate_hour,languages,socials,newsletter_accepted'

const UNIQUE_VIOLATION = '23505'

type CandidateAccessRow = {
  id: string
  email: string | null
  status: string
  access_token: string | null
}

type FormRow = {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  comment: string | null
  profile: string[] | null
  experience: string | null
  work_types: string[] | null
  rate_day: number | null
  rate_hour: number | null
  languages: Record<string, string> | null
  socials: Record<string, string> | null
  newsletter_accepted: boolean | null
}

function fail(operation: string, error: { message: string }): never {
  throw new Error(`Supabase-talent (${operation}): ${error.message}`)
}

/**
 * `ilike` trata `%` y `_` como comodines, y `_` es muy corriente en un email:
 * sin escapar, `a_b@x.com` también encontraría `aXb@x.com`.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

function toAccess(row: CandidateAccessRow): CandidateAccess {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    accessToken: row.access_token,
  }
}

async function listPendingFilesOf(candidateId: string) {
  const { data, error } = await getTalentClient()
    .from('files')
    .select('id,path,status')
    .eq('candidate_id', candidateId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) fail('files.select', error)

  return (data ?? []) as CandidateFileRecord[]
}

export const supabaseTalentRepository: TalentRepository = {
  async findByEmail(email) {
    const { data, error } = await getTalentClient()
      .from('candidates')
      .select('id,email,status,access_token')
      .ilike('email', escapeLikePattern(email))
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(1)

    if (error) fail('candidates.findByEmail', error)

    const row = (data as CandidateAccessRow[] | null)?.[0]

    return row ? toAccess(row) : null
  },

  async insertCandidate(row) {
    const { data, error } = await getTalentClient()
      .from('candidates')
      .insert(row)
      .select('id')
      .single()

    if (error) {
      if (error.code === UNIQUE_VIOLATION)
        throw new DuplicateCandidateEmailError()

      fail('candidates.insert', error)
    }

    return { id: (data as { id: string }).id }
  },

  async setAccessToken(candidateId, accessToken) {
    const { error } = await getTalentClient()
      .from('candidates')
      .update({ access_token: accessToken })
      .eq('id', candidateId)

    if (error) fail('candidates.setAccessToken', error)
  },

  async findAccessByToken(accessToken) {
    const { data, error } = await getTalentClient()
      .from('candidates')
      .select('id,email,status,access_token')
      .eq('access_token', accessToken)
      .limit(1)

    if (error) fail('candidates.findAccessByToken', error)

    const row = (data as CandidateAccessRow[] | null)?.[0]

    return row ? toAccess(row) : null
  },

  async findFormByToken(accessToken) {
    const client = getTalentClient()

    const { data, error } = await client
      .from('candidates')
      .select(FORM_COLUMNS)
      .eq('access_token', accessToken)
      .limit(1)

    if (error) fail('candidates.findFormByToken', error)

    const row = (data as FormRow[] | null)?.[0]

    if (!row) return null

    const projectsResult = await client
      .from('projects')
      .select('link,comment')
      .eq('candidate_id', row.id)
      .order('created_at', { ascending: true })

    if (projectsResult.error) fail('projects.select', projectsResult.error)

    const record: CandidateFormRecord = {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      comment: row.comment,
      profile: row.profile,
      experience: row.experience,
      workTypes: row.work_types,
      rateDay: row.rate_day,
      rateHour: row.rate_hour,
      languages: row.languages,
      socials: row.socials,
      newsletterAccepted: row.newsletter_accepted,
      projects: (projectsResult.data ?? []) as CandidateProject[],
      files: await listPendingFilesOf(row.id),
    }

    return record
  },

  async updateCandidate(candidateId, row) {
    const { error } = await getTalentClient()
      .from('candidates')
      .update(row)
      .eq('id', candidateId)

    if (error) {
      // Cambiar el email a uno que ya tiene otra fila.
      if (error.code === UNIQUE_VIOLATION)
        throw new DuplicateCandidateEmailError()

      fail('candidates.update', error)
    }
  },

  /**
   * Inserta los nuevos y borra después los antiguos, no al revés: si falla la
   * inserción el candidato conserva los que tenía, y `Get projects` de n8n se
   * detiene con cero proyectos. El resultado final es el de «borrar y volver a
   * insertar» de hoy.
   */
  async replaceProjects(candidateId, rows) {
    const client = getTalentClient()

    const previous = await client
      .from('projects')
      .select('id')
      .eq('candidate_id', candidateId)

    if (previous.error) fail('projects.select', previous.error)

    const insert = await client.from('projects').insert(rows)

    if (insert.error) fail('projects.insert', insert.error)

    const previousIds = ((previous.data ?? []) as { id: string }[]).map(
      (project) => project.id,
    )

    if (previousIds.length === 0) return

    const removal = await client.from('projects').delete().in('id', previousIds)

    if (removal.error) fail('projects.delete', removal.error)
  },

  listPendingFiles: listPendingFilesOf,

  async insertFile(row) {
    const { data, error } = await getTalentClient()
      .from('files')
      .insert(row)
      .select('id')
      .single()

    if (error) fail('files.insert', error)

    return { id: (data as { id: string }).id }
  },

  async findPendingFile(candidateId, fileId) {
    const { data, error } = await getTalentClient()
      .from('files')
      .select('id,path,status')
      .eq('id', fileId)
      .eq('candidate_id', candidateId)
      .eq('status', 'pending')
      .limit(1)

    if (error) fail('files.findPendingFile', error)

    return ((data as CandidateFileRecord[] | null)?.[0] ??
      null) satisfies CandidateFileRecord | null
  },

  async deleteFile(candidateId, fileId) {
    const { error } = await getTalentClient()
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('candidate_id', candidateId)

    if (error) fail('files.delete', error)
  },
}

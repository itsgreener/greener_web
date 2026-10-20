import { vi } from 'vitest'

import type { TalentLimiters } from '@/modules/talent/application/talentLimiters'
import { DuplicateCandidateEmailError } from '@/modules/talent/domain/talentErrors'
import type {
  CandidateAccess,
  CandidateFileRecord,
  CandidateFormRecord,
} from '@/modules/talent/domain/talentModels'
import type {
  AttemptLimiter,
  TalentAdminRepository,
  TalentFileStorage,
  TalentNewsletter,
  TalentRepository,
  TalentVirusScanner,
  TalentWorkflows,
} from '@/modules/talent/domain/talentPorts'
import type {
  CandidateUpdateRow,
  FileRow,
  NewCandidateRow,
  ProjectRow,
  StaffUploadRow,
} from '@/modules/talent/domain/talentRows'

/** Token de ejemplo con forma de UUID v4. */
export const TOKEN = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
export const CANDIDATE_ID = '0b1f1a52-3b8e-4a0e-9c1d-5d4e6f7a8b9c'

export const CONTEXT = { visitorKey: 'visitor-1', ipKey: 'ip-hash-1' }

/** Cuerpo válido del formulario, tal y como llega del navegador. */
export function validFormInput(overrides: Record<string, unknown> = {}) {
  return {
    email: '  Ada@Example.com ',
    phone: '+34 600 000 000',
    comment: 'Me gustaría colaborar.',
    profile: ['diseno', 'video', 'diseno'],
    experience: '5-10',
    workTypes: ['freelance', 'fulltime'],
    rateDay: 300,
    rateHour: null,
    languages: {
      English: 'avanzado',
      Castellano: 'nativo',
      Català: 'bilingue',
    },
    socials: { LinkedIn: 'https://linkedin.com/in/ada', Behance: '' },
    newsletterAccepted: true,
    projects: [
      { link: 'https://ada.example/portfolio', comment: 'Mi portfolio' },
      { link: 'https://ada.example/reel', comment: '' },
    ],
    ...overrides,
  }
}

/** Limitador falso: deja pasar hasta `max` intentos por clave. */
export function limiter(max = 1000): AttemptLimiter & { calls: string[] } {
  const counts = new Map<string, number>()
  const calls: string[] = []

  return {
    calls,
    check(key) {
      calls.push(key)
      const next = (counts.get(key) ?? 0) + 1
      counts.set(key, next)

      return next <= max
    },
  }
}

export function openLimiters(
  overrides: Partial<TalentLimiters> = {},
): TalentLimiters {
  return {
    signupByIp: limiter(),
    signupByVisitor: limiter(),
    signupByEmail: limiter(),
    formReadByIp: limiter(),
    formSaveByIp: limiter(),
    formSaveByToken: limiter(),
    uploadByIp: limiter(),
    uploadByToken: limiter(),
    ...overrides,
  }
}

type StoredCandidate = CandidateAccess & Partial<CandidateFormRecord>

/**
 * Repositorio en memoria que además anota cada operación en `log`, para
 * comprobar el orden (candidato → proyectos → …) y las filas exactas que se
 * escribirían en Supabase.
 */
export function fakeRepository(initial: StoredCandidate[] = []) {
  const log: string[] = []
  const failOn = new Set<string>()
  const candidates = new Map<string, StoredCandidate>()
  const insertedCandidates: NewCandidateRow[] = []
  const updates: { id: string; row: CandidateUpdateRow }[] = []
  const projects: ProjectRow[] = []
  const files: (CandidateFileRecord & { candidate_id: string })[] = []
  const insertedFiles: FileRow[] = []
  let sequence = 0

  for (const candidate of initial) candidates.set(candidate.id, candidate)

  function step(name: string) {
    log.push(name)
    if (failOn.has(name)) throw new Error(`fallo simulado en ${name}`)
  }

  const repository: TalentRepository = {
    async findByEmail(email) {
      step('findByEmail')

      return (
        [...candidates.values()].find(
          (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
        ) ?? null
      )
    },
    async insertCandidate(row) {
      step('insertCandidate')

      if ([...candidates.values()].some((c) => c.email === row.email)) {
        throw new DuplicateCandidateEmailError()
      }

      insertedCandidates.push(row)
      const id = `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`
      candidates.set(id, {
        id,
        email: row.email,
        status: row.status,
        accessToken: row.access_token,
      })

      return { id }
    },
    async setAccessToken(id, accessToken) {
      step('setAccessToken')
      const candidate = candidates.get(id)
      if (candidate) candidate.accessToken = accessToken
    },
    async findAccessByToken(token) {
      step('findAccessByToken')

      return (
        [...candidates.values()].find((c) => c.accessToken === token) ?? null
      )
    },
    async findFormByToken(token) {
      step('findFormByToken')
      const candidate = [...candidates.values()].find(
        (c) => c.accessToken === token,
      )

      if (!candidate) return null

      return {
        name: null,
        phone: null,
        comment: null,
        profile: null,
        experience: null,
        workTypes: null,
        rateDay: null,
        rateHour: null,
        languages: null,
        socials: null,
        newsletterAccepted: null,
        projects: [],
        files: [],
        ...candidate,
      } as CandidateFormRecord
    },
    async updateCandidate(id, row) {
      step('updateCandidate')
      updates.push({ id, row })
    },
    async replaceProjects(_id, rows) {
      step('replaceProjects')
      projects.push(...rows)
    },
    async listPendingFiles(id) {
      step('listPendingFiles')

      return files.filter((file) => file.candidate_id === id)
    },
    async insertFile(row) {
      step('insertFile')
      insertedFiles.push(row)
      const id = `11111111-1111-4111-8111-${String(++sequence).padStart(12, '0')}`
      files.push({
        id,
        path: row.path,
        status: 'pending',
        candidate_id: row.candidate_id,
      })

      return { id }
    },
    async findPendingFile(candidateId, fileId) {
      step('findPendingFile')

      return (
        files.find(
          (file) => file.id === fileId && file.candidate_id === candidateId,
        ) ?? null
      )
    },
    async deleteFile(candidateId, fileId) {
      step('deleteFile')
      const index = files.findIndex(
        (file) => file.id === fileId && file.candidate_id === candidateId,
      )
      if (index >= 0) files.splice(index, 1)
    },
  }

  return {
    repository,
    log,
    failOn,
    candidates,
    insertedCandidates,
    updates,
    projects,
    files,
    insertedFiles,
  }
}

export function fakeWorkflows() {
  const sendFormLink = vi.fn<(token: string) => Promise<void>>(async () => {})
  const processCandidate = vi.fn<(id: string) => Promise<void>>(async () => {})
  const processPendingCvs = vi.fn<() => Promise<void>>(async () => {})
  const workflows: TalentWorkflows = {
    sendFormLink,
    processCandidate,
    processPendingCvs,
  }

  return { workflows, sendFormLink, processCandidate, processPendingCvs }
}

export function fakeNewsletter() {
  const subscribe = vi.fn<(email: string) => Promise<void>>(async () => {})
  const newsletter: TalentNewsletter = { subscribe }

  return { newsletter, subscribe }
}

export function fakeStorage() {
  const upload = vi.fn<TalentFileStorage['upload']>(async () => {})
  const remove = vi.fn<TalentFileStorage['remove']>(async () => {})
  const createSignedUrl = vi.fn<TalentFileStorage['createSignedUrl']>(
    async (path, seconds) =>
      `https://signed.example/${path}?expires=${seconds}`,
  )
  const storage: TalentFileStorage = { upload, remove, createSignedUrl }

  return { storage, upload, remove, createSignedUrl }
}

export function fakeScanner() {
  const scan = vi.fn<TalentVirusScanner['scan']>(async () => {})
  const scanner: TalentVirusScanner = { scan }

  return { scanner, scan }
}

/** Primeros bytes reales de cada tipo, con relleno detrás. */
export const FILE_BYTES = {
  pdf: Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0, 0]),
  png: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]),
  jpeg: Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46,
  ]),
  webp: Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
  ]),
  doc: Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]),
  docx: Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0, 0, 0]),
  text: new TextEncoder().encode('esto es texto plano, no un documento'),
}

/**
 * Repositorio del ABM en memoria. `calls` anota cada operación; `paths`
 * programa la ruta que devuelve `findStoredPath` (clave `candidato` o
 * `candidato:fichero`) y `counts` lo que cuenta cada estado.
 */
export function fakeAdminRepository(
  options: {
    access?: CandidateAccess[]
    counts?: Record<string, number>
    paths?: Record<string, string | null>
    requeueResult?: boolean
  } = {},
) {
  const calls: string[] = []
  const failOn = new Set<string>()
  const access = new Map((options.access ?? []).map((item) => [item.id, item]))
  const staffRows: StaffUploadRow[] = []
  const tokens: { id: string; token: string }[] = []
  const counts = { ...(options.counts ?? {}) }

  function step(name: string) {
    calls.push(name)
    if (failOn.has(name)) throw new Error(`fallo simulado en ${name}`)
  }

  const admin: TalentAdminRepository = {
    async search() {
      step('search')

      return { items: [], total: 0 }
    },
    async findDetail() {
      step('findDetail')

      return null
    },
    async countByStatus() {
      step('countByStatus')

      return counts
    },
    async findStoredPath(candidateId, fileId) {
      step('findStoredPath')
      const key = fileId ? `${candidateId}:${fileId}` : candidateId

      return options.paths?.[key] ?? null
    },
    async insertStaffCandidate(row) {
      step('insertStaffCandidate')
      staffRows.push(row)

      return {
        id: `00000000-0000-4000-8000-${String(staffRows.length).padStart(12, '0')}`,
      }
    },
    async requeueForProcessing() {
      step('requeueForProcessing')

      return options.requeueResult ?? true
    },
    async findAccessById(id) {
      step('findAccessById')

      return access.get(id) ?? null
    },
    async setAccessToken(id, token) {
      step('setAccessToken')
      tokens.push({ id, token })
    },
  }

  return { admin, calls, failOn, staffRows, tokens, counts }
}

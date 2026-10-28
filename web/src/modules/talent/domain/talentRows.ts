import {
  CANDIDATE_STATUS,
  CV_UPLOAD_PREFIX,
  TALENT_ACCESS_TTL_DAYS,
  WORK_TYPE_FREELANCE,
  type AllowedFileExtension,
} from './talentConstants'
import type { CandidateFormInput } from './talentSchemas'

/**
 * Filas que la web escribe en Supabase-talent. Es el punto donde se cumple el
 * contrato de datos (`contrato-datos-talent.md` §4): n8n lee estas columnas
 * sin comprobar nada, así que un `null` donde espera un array o un objeto
 * rompe el aviso final. Los tests de contrato fijan cada fila columna a
 * columna.
 */

export type NewCandidateRow = {
  email: string
  status: typeof CANDIDATE_STATUS.processed
  access_token: string
  access_token_expires_at: string
}

export type CandidateUpdateRow = {
  email: string
  /** `completed`: el candidato ha enviado el formulario (n8n lo cierra). */
  status: typeof CANDIDATE_STATUS.completed
  phone: string | null
  comment: string | null
  profile: string[]
  experience: string | null
  work_types: string[]
  rate_day: number | null
  rate_hour: number | null
  languages: Record<string, string>
  socials: Record<string, string>
  newsletter_accepted: boolean
}

/**
 * CV subido por el personal desde el ABM. n8n (`Procesar nuevo CV`) lo recoge
 * por `status = 'pending'` y rellena el resto: email, nombre, teléfono, perfil,
 * `access_token`, `ai_comment`, `file_name`…
 */
export type StaffUploadRow = {
  status: typeof CANDIDATE_STATUS.pending
  file_path: string
  /** Email de quien sube: n8n lo usa de copia y para avisarle de duplicados. */
  uploaded_by: string
}

export type ProjectRow = {
  candidate_id: string
  link: string
  comment: string | null
  access_token: string
}

export type FileRow = {
  candidate_id: string
  path: string
  access_token: string
}

/** Fin de la ventana del enlace personal emitido en `now` (ISO, UTC). */
export function accessExpiresAt(now: Date = new Date()): string {
  return new Date(
    now.getTime() + TALENT_ACCESS_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
}

/**
 * Alta por email. El `status` es obligatorio (la columna es `NOT NULL` sin
 * valor por defecto) y vale `processed`: la fila ya está lista para que n8n le
 * envíe el enlace. El resto de columnas quedan en sus valores por defecto.
 */
export function buildSignupRow(
  email: string,
  accessToken: string,
  now: Date = new Date(),
): NewCandidateRow {
  return {
    email,
    status: CANDIDATE_STATUS.processed,
    access_token: accessToken,
    access_token_expires_at: accessExpiresAt(now),
  }
}

/**
 * Subida del personal. Solo `status`, `file_path` y `uploaded_by`: la web
 * antigua escribía además `uploaded_by_id` (el id de su propio usuario de
 * Supabase), que n8n no lee y que aquí no tendría sentido (el admin es un
 * usuario del proyecto de Greener, no del de talent).
 */
export function buildStaffUploadRow(
  path: string,
  uploadedBy: string,
): StaffUploadRow {
  return {
    status: CANDIDATE_STATUS.pending,
    file_path: path,
    uploaded_by: uploadedBy,
  }
}

/**
 * Datos del formulario. Los arrays y los objetos nunca son `null`; las redes
 * sin enlace se quitan (el aviso lista los valores del objeto).
 *
 * - `status = 'completed'`, como la web antigua; `closed` lo pone n8n al
 *   terminar. No se escribe `name` (lo pone n8n al analizar el CV) ni nada
 *   más de n8n.
 * - Las tarifas solo valen si el candidato marcó «freelance» (es el único
 *   caso en que el formulario las pregunta).
 * - `currentEmail` es el email que ya tiene la fila: si el del formulario es
 *   el mismo salvo mayúsculas, se conserva tal cual está guardado.
 */
export function buildCandidateUpdate(
  form: CandidateFormInput,
  currentEmail: string | null = null,
): CandidateUpdateRow {
  const languages: Record<string, string> = {}

  for (const [language, level] of Object.entries(form.languages)) {
    if (level) languages[language] = level
  }

  const socials: Record<string, string> = {}

  for (const [network, url] of Object.entries(form.socials)) {
    if (url) socials[network] = url
  }

  const freelance = form.workTypes.includes(WORK_TYPE_FREELANCE)
  const sameEmail = currentEmail?.toLowerCase() === form.email

  return {
    email: sameEmail && currentEmail ? currentEmail : form.email,
    status: CANDIDATE_STATUS.completed,
    phone: form.phone,
    comment: form.comment,
    profile: form.profile,
    experience: form.experience,
    work_types: form.workTypes,
    rate_day: freelance ? form.rateDay : null,
    rate_hour: freelance ? form.rateHour : null,
    languages,
    socials,
    newsletter_accepted: form.newsletterAccepted,
  }
}

/** Proyectos del candidato; `comment` puede ser `null` (el aviso lo cubre). */
export function buildProjectRows(
  candidateId: string,
  accessToken: string,
  form: CandidateFormInput,
): ProjectRow[] {
  return form.projects.map((project) => ({
    candidate_id: candidateId,
    link: project.link,
    comment: project.comment,
    access_token: accessToken,
  }))
}

/**
 * Ruta en el bucket: `uploads/<uuid>.<ext>`, generada aquí, en ASCII y sin
 * espacios. n8n descarga por esta ruta y, en la rama de documentos, borra
 * según el nombre que le devuelve el modelo.
 */
export function buildStoragePath(
  id: string,
  extension: AllowedFileExtension,
): string {
  return `${CV_UPLOAD_PREFIX}${id}.${extension}`
}

/**
 * Fila de `files`: `type` y `status` los pone n8n (`status` nace `pending` por
 * defecto de la columna).
 */
export function buildFileRow(
  candidateId: string,
  accessToken: string,
  path: string,
): FileRow {
  return { candidate_id: candidateId, path, access_token: accessToken }
}

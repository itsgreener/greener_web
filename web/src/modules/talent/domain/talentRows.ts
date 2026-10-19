import {
  CANDIDATE_STATUS,
  CV_UPLOAD_PREFIX,
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
}

export type CandidateUpdateRow = {
  name: string
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

/**
 * Alta por email. El `status` es obligatorio (la columna es `NOT NULL` sin
 * valor por defecto) y vale `processed`: la fila ya está lista para que n8n le
 * envíe el enlace. El resto de columnas quedan en sus valores por defecto.
 */
export function buildSignupRow(
  email: string,
  accessToken: string,
): NewCandidateRow {
  return {
    email,
    status: CANDIDATE_STATUS.processed,
    access_token: accessToken,
  }
}

/**
 * Datos del formulario. Los arrays y los objetos nunca son `null`; las redes
 * sin enlace se quitan (el aviso lista los valores del objeto). No se toca
 * `status`: de `sent` a `closed` pasa n8n cuando termina de procesar.
 */
export function buildCandidateUpdate(
  form: CandidateFormInput,
): CandidateUpdateRow {
  const languages: Record<string, string> = {}

  for (const [language, level] of Object.entries(form.languages)) {
    if (level) languages[language] = level
  }

  const socials: Record<string, string> = {}

  for (const [network, url] of Object.entries(form.socials)) {
    if (url) socials[network] = url
  }

  return {
    name: form.name,
    phone: form.phone,
    comment: form.comment,
    profile: form.profile,
    experience: form.experience,
    work_types: form.workTypes,
    rate_day: form.rateDay,
    rate_hour: form.rateHour,
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

/** Lo que el dominio necesita saber de una fila, sin los nombres de columna. */

export type CandidateAccess = {
  id: string
  email: string | null
  status: string
  /** Puede faltar en filas que sube el personal y n8n aún no ha procesado. */
  accessToken: string | null
}

export type CandidateProject = {
  link: string
  comment: string | null
}

export type CandidateFileRecord = {
  id: string
  path: string
  status: string | null
}

/** Datos de un candidato tal y como los devuelve la base. */
export type CandidateFormRecord = {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  comment: string | null
  profile: string[] | null
  experience: string | null
  workTypes: string[] | null
  rateDay: number | null
  rateHour: number | null
  languages: Record<string, string> | null
  socials: Record<string, string> | null
  newsletterAccepted: boolean | null
  projects: CandidateProject[]
  files: CandidateFileRecord[]
}

/**
 * Lo único que recibe el navegador al abrir su enlace. Antes se descargaba la
 * fila entera (`select *`): aquí no salen el token, el estado, el comentario
 * de la IA, la ruta del CV ni quién lo subió.
 */
export type CandidateFormView = {
  email: string
  name: string
  phone: string
  comment: string
  profile: string[]
  experience: string
  workTypes: string[]
  rateDay: number | null
  rateHour: number | null
  languages: Record<string, string>
  socials: Record<string, string>
  newsletterAccepted: boolean
  projects: CandidateProject[]
  files: UploadedFileView[]
}

export type UploadedFileView = {
  id: string
  /** Extensión del fichero (el nombre original no se guarda). */
  extension: string
}

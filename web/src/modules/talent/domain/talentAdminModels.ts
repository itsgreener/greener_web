import type { CandidateProject } from './talentModels'

/**
 * Modelos del ABM de Talent (`/admin/talent`). Nunca llevan el `access_token`:
 * es la credencial del candidato sobre sus propios datos, y el personal no
 * necesita verla (para reenviar el enlace hay una acción).
 */

/**
 * Dónde está un CV. Los hay de cuatro maneras (contrato de datos, §3):
 * en Drive (lo gobierna Drive, no hay URL firmada), en el bucket `cvs` (aún sin
 * mover; se sirve con URL firmada de vida corta), un texto que no es ninguno de
 * los dos (`external`, 21 filas con un destino sin identificar) o ninguno.
 */
export type CvLocationKind = 'drive' | 'bucket' | 'external' | 'none'

export type CandidateListItem = {
  id: string
  name: string | null
  email: string | null
  status: string
  profile: string[]
  cvKind: CvLocationKind
  /** Ficheros sueltos en `files` (portfolios, imágenes…), sin contar el CV. */
  filesCount: number
  uploadedBy: string | null
  /** Hay filas antiguas sin fecha (contrato de datos, §6). */
  createdAt: string | null
}

export type CandidateSearchResult = {
  items: CandidateListItem[]
  total: number
}

export type CandidateFileDetail = {
  id: string
  type: string | null
  status: string | null
  kind: CvLocationKind
  createdAt: string | null
}

export type CandidateDetail = {
  id: string
  status: string
  createdAt: string | null
  name: string | null
  email: string | null
  phone: string | null
  comment: string | null
  /** Valoración de la IA al analizar el CV. */
  aiComment: string | null
  profile: string[]
  experience: string | null
  workTypes: string[]
  rateDay: number | null
  rateHour: number | null
  languages: Record<string, string>
  socials: Record<string, string>
  newsletterAccepted: boolean | null
  uploadedBy: string | null
  blocked: boolean | null
  cvKind: CvLocationKind
  /** Nombre que n8n dio al CV (`file_name`), solo para mostrar. */
  cvName: string | null
  projects: CandidateProject[]
  files: CandidateFileDetail[]
}

/** Cuántas filas hay en cada estado (`status` es texto libre). */
export type StatusCounts = Record<string, number>

/**
 * Un fichero del candidato al que se quiere llegar: su CV (`cv`) o una fila de
 * `files`. El navegador solo manda identificadores; la ruta sale de la base,
 * nunca de la petición (así no se puede pedir la firma de un objeto ajeno).
 */
export type CvTarget = { candidateId: string; fileId: string | null }

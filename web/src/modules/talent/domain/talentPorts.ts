import type {
  CandidateAccess,
  CandidateFileRecord,
  CandidateFormRecord,
} from './talentModels'
import type {
  CandidateUpdateRow,
  FileRow,
  NewCandidateRow,
  ProjectRow,
} from './talentRows'

/** Acceso a las tres tablas de Supabase-talent. */
export interface TalentRepository {
  /** Búsqueda por email sin distinguir mayúsculas. */
  findByEmail(email: string): Promise<CandidateAccess | null>

  /** @throws DuplicateCandidateEmailError si el email ya existe */
  insertCandidate(row: NewCandidateRow): Promise<{ id: string }>

  setAccessToken(candidateId: string, accessToken: string): Promise<void>

  /** Solo identifica al candidato del enlace (para subir o borrar ficheros). */
  findAccessByToken(accessToken: string): Promise<CandidateAccess | null>

  /** Datos que necesita el formulario, con sus proyectos y ficheros pendientes. */
  findFormByToken(accessToken: string): Promise<CandidateFormRecord | null>

  updateCandidate(candidateId: string, row: CandidateUpdateRow): Promise<void>

  /** Sustituye los proyectos del candidato por los nuevos (nunca deja cero). */
  replaceProjects(candidateId: string, rows: ProjectRow[]): Promise<void>

  /** Ficheros subidos y aún sin procesar por n8n. */
  listPendingFiles(candidateId: string): Promise<CandidateFileRecord[]>

  insertFile(row: FileRow): Promise<{ id: string }>

  findPendingFile(
    candidateId: string,
    fileId: string,
  ): Promise<CandidateFileRecord | null>

  deleteFile(candidateId: string, fileId: string): Promise<void>
}

/** Bucket privado `cvs`. */
export interface TalentFileStorage {
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<void>
  remove(path: string): Promise<void>
}

/** Los workflows de n8n a los que llama el servidor. */
export interface TalentWorkflows {
  /** `Enviar mail a candidato`: envía el enlace del formulario. */
  sendFormLink(accessToken: string): Promise<void>

  /** `Guardar archivos`: procesa lo que ha enviado el candidato. */
  processCandidate(candidateId: string): Promise<void>
}

/** Alta en la audiencia de Mailchimp de talent (doble opt-in). */
export interface TalentNewsletter {
  subscribe(email: string): Promise<void>
}

export interface TalentVirusScanner {
  /** @throws FileScanRejectedError si no se puede dar por limpio */
  scan(bytes: Uint8Array, fileName: string): Promise<void>
}

/** Límite de intentos por clave. */
export interface AttemptLimiter {
  /** true si el intento cabe en el cupo (y ya cuenta). */
  check(key: string): boolean
}

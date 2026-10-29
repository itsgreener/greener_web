import type {
  CandidateDeletionTarget,
  CandidateDetail,
  CandidateSearchResult,
  StatusCounts,
} from './talentAdminModels'
import type { CandidateSearchQuery } from './talentSearchQuery'
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
  StaffUploadRow,
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

  /** @throws DuplicateCandidateEmailError si el email nuevo es de otra fila */
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

/**
 * Lo que el ABM hace con Supabase-talent: leer para el listado y la ficha y
 * escribir las subidas del personal. Aparte de `TalentRepository` porque lo
 * usa otro lado (sesión de admin, no el visitante) y no comparten casos de uso.
 */
export interface TalentAdminRepository {
  search(query: CandidateSearchQuery): Promise<CandidateSearchResult>

  findDetail(candidateId: string): Promise<CandidateDetail | null>

  /** Filas por estado, para el resumen de arriba del listado. */
  countByStatus(): Promise<StatusCounts>

  /**
   * Ruta guardada del CV del candidato (`file_path`) o, con `fileId`, de una
   * de sus filas de `files` (`path`). `null` si no existe o no tiene.
   */
  findStoredPath(
    candidateId: string,
    fileId: string | null,
  ): Promise<string | null>

  insertStaffCandidate(row: StaffUploadRow): Promise<{ id: string }>

  /**
   * Devuelve la fila a `pending` si está en un estado reprocesable y su CV
   * sigue en el bucket. `false` si no se cumple alguna de las dos cosas.
   */
  requeueForProcessing(candidateId: string): Promise<boolean>

  /** Acceso (email, estado, token) de un candidato por su id. */
  findAccessById(candidateId: string): Promise<CandidateAccess | null>

  setAccessToken(candidateId: string, accessToken: string): Promise<void>

  /** Qué hay que borrar de un candidato; `null` si no existe. */
  findDeletionTarget(
    candidateId: string,
  ): Promise<CandidateDeletionTarget | null>

  /** Borra proyectos, ficheros y la propia fila del candidato, en ese orden. */
  deleteCandidateRows(candidateId: string): Promise<void>

  /**
   * Ids de los candidatos cuyo plazo de conservación ha vencido a `now` (más
   * antiguos primero, los de `created_at` nulo los primeros si ya les toca).
   * El criterio está en `talentRetention.ts`.
   */
  listExpiredCandidateIds(now: Date, limit: number): Promise<string[]>
}

/** Bucket privado `cvs`. */
export interface TalentFileStorage {
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<void>
  remove(path: string): Promise<void>

  /** URL de lectura que caduca a los `expiresInSeconds`. */
  createSignedUrl(path: string, expiresInSeconds: number): Promise<string>
}

/** Los workflows de n8n a los que llama el servidor. */
export interface TalentWorkflows {
  /** `Enviar mail a candidato`: envía el enlace del formulario. */
  sendFormLink(accessToken: string): Promise<void>

  /** `Guardar archivos`: procesa lo que ha enviado el candidato. */
  processCandidate(candidateId: string): Promise<void>

  /**
   * `Procesar nuevo CV`: procesa **todas** las filas `pending`. Sin cuerpo.
   * @throws WebhookNotConfiguredError si falta su variable de entorno
   */
  processPendingCvs(): Promise<void>
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
  /** true si el intento cabe en el cupo (y ya cuenta). Hay que esperarla: el cupo puede ser compartido. */
  check(key: string): boolean | Promise<boolean>
}

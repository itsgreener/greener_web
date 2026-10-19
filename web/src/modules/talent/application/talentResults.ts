/**
 * Contexto de la petición que pone la ruta: claves ya anónimas (la cookie de
 * visitante y el hash de la IP, nunca la IP en crudo) para los límites.
 */
export type TalentRequestContext = {
  visitorKey: string
  ipKey: string
}

/** Por qué se rechaza un fichero; la ruta lo traduce a un mensaje. */
export type FileRejection =
  'file_empty' | 'file_too_large' | 'file_type' | 'too_many_files' | 'file_scan'

export type TalentFailure =
  | { ok: false; reason: 'invalid'; fieldErrors: Record<string, string[]> }
  | { ok: false; reason: 'rate_limited' }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'file_rejected'; rejection: FileRejection }

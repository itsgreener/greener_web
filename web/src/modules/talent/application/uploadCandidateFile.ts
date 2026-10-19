import { TALENT_FILE_LIMITS } from '@/modules/talent/domain/talentConstants'
import { FileScanRejectedError } from '@/modules/talent/domain/talentErrors'
import {
  allowedExtensionOf,
  contentTypeOf,
  detectFileKind,
  extensionMatchesKind,
} from '@/modules/talent/domain/talentFileKind'
import type {
  TalentFileStorage,
  TalentRepository,
  TalentVirusScanner,
} from '@/modules/talent/domain/talentPorts'
import {
  buildFileRow,
  buildStoragePath,
} from '@/modules/talent/domain/talentRows'
import { isWellFormedToken } from '@/modules/talent/domain/talentSchemas'
import type { UploadedFileView } from '@/modules/talent/domain/talentModels'

import type { TalentLimiters } from './talentLimiters'
import type { TalentFailure, TalentRequestContext } from './talentResults'

export type UploadCandidateFileResult =
  { ok: true; file: UploadedFileView } | TalentFailure

/**
 * `POST /api/talent/form/[token]/files`: la subida pasa por el servidor, el
 * navegador no habla con Supabase. Un fichero por petición.
 *
 * Orden: token → límites → tamaño → tipo (extensión Y contenido) → cupo del
 * candidato → antivirus → bucket → fila en `files`. Si falla la fila, se borra
 * el objeto del bucket para no dejar ficheros huérfanos con datos personales.
 *
 * El nombre del visitante no se usa para nada: la ruta es
 * `uploads/<uuid>.<ext>`, generada aquí (n8n borra del bucket según el nombre
 * que le devuelve el modelo, y un nombre con espacios o acentos puede volver
 * alterado).
 */
export function makeUploadCandidateFile({
  repository,
  storage,
  scanner,
  limiters,
  newId,
}: {
  repository: TalentRepository
  storage: TalentFileStorage
  scanner: TalentVirusScanner
  limiters: TalentLimiters
  newId: () => string
}) {
  return async function uploadCandidateFile(
    token: string,
    file: { name: string; bytes: Uint8Array },
    context: TalentRequestContext,
  ): Promise<UploadCandidateFileResult> {
    if (!limiters.uploadByIp.check(context.ipKey)) {
      return { ok: false, reason: 'rate_limited' }
    }

    if (!isWellFormedToken(token)) return { ok: false, reason: 'not_found' }

    if (!limiters.uploadByToken.check(token)) {
      return { ok: false, reason: 'rate_limited' }
    }

    if (file.bytes.byteLength === 0) {
      return { ok: false, reason: 'file_rejected', rejection: 'file_empty' }
    }

    if (file.bytes.byteLength > TALENT_FILE_LIMITS.maxFileBytes) {
      return { ok: false, reason: 'file_rejected', rejection: 'file_too_large' }
    }

    const extension = allowedExtensionOf(file.name)
    const kind = detectFileKind(file.bytes)

    if (!extension || !kind || !extensionMatchesKind(extension, kind)) {
      return { ok: false, reason: 'file_rejected', rejection: 'file_type' }
    }

    try {
      const candidate = await repository.findAccessByToken(token)

      if (!candidate || !candidate.accessToken) {
        return { ok: false, reason: 'not_found' }
      }

      const pending = await repository.listPendingFiles(candidate.id)

      if (pending.length >= TALENT_FILE_LIMITS.maxFilesPerCandidate) {
        return {
          ok: false,
          reason: 'file_rejected',
          rejection: 'too_many_files',
        }
      }

      try {
        await scanner.scan(file.bytes, `cv.${extension}`)
      } catch (error) {
        if (error instanceof FileScanRejectedError) {
          return { ok: false, reason: 'file_rejected', rejection: 'file_scan' }
        }

        throw error
      }

      const path = buildStoragePath(newId(), extension)

      await storage.upload(path, file.bytes, contentTypeOf(kind))

      try {
        const row = await repository.insertFile(
          buildFileRow(candidate.id, candidate.accessToken, path),
        )

        return { ok: true, file: { id: row.id, extension } }
      } catch (error) {
        await storage.remove(path).catch((cleanupError) => {
          console.error(
            'Talent: objeto huérfano en el bucket',
            path,
            cleanupError,
          )
        })

        throw error
      }
    } catch (error) {
      console.error('Talent: no se pudo guardar el fichero', error)

      return { ok: false, reason: 'unavailable' }
    }
  }
}

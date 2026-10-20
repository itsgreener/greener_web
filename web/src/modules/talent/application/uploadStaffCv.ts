import { TALENT_FILE_LIMITS } from '@/modules/talent/domain/talentConstants'
import { FileScanRejectedError } from '@/modules/talent/domain/talentErrors'
import {
  allowedExtensionOf,
  contentTypeOf,
  detectFileKind,
  extensionMatchesKind,
} from '@/modules/talent/domain/talentFileKind'
import type {
  TalentAdminRepository,
  TalentFileStorage,
  TalentVirusScanner,
} from '@/modules/talent/domain/talentPorts'
import {
  buildStaffUploadRow,
  buildStoragePath,
} from '@/modules/talent/domain/talentRows'

import type { FileRejection } from './talentResults'

export type UploadStaffCvResult =
  | { ok: true; candidateId: string }
  | { ok: false; reason: 'file_rejected'; rejection: FileRejection }
  | { ok: false; reason: 'unavailable' }

/**
 * Subida de un CV por el personal (ABM). Mismas comprobaciones que el
 * formulario público —tamaño, extensión Y contenido, antivirus— y mismo
 * resultado en el bucket (`uploads/<uuid>.<ext>`), pero aquí nace una fila
 * nueva en `candidates` con `status = 'pending'` en lugar de una fila de
 * `files`. **No lanza el procesado**: eso se hace una vez por lote
 * (`processPendingCvs`), porque el workflow procesa todas las `pending`.
 *
 * Si falla la fila, se borra el objeto para no dejar un CV huérfano.
 */
export function makeUploadStaffCv({
  admin,
  storage,
  scanner,
  newId,
}: {
  admin: TalentAdminRepository
  storage: TalentFileStorage
  scanner: TalentVirusScanner
  newId: () => string
}) {
  return async function uploadStaffCv(
    file: { name: string; bytes: Uint8Array },
    uploadedBy: string,
  ): Promise<UploadStaffCvResult> {
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
        const row = await admin.insertStaffCandidate(
          buildStaffUploadRow(path, uploadedBy),
        )

        return { ok: true, candidateId: row.id }
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
      console.error('Talent: no se pudo guardar el CV del personal', error)

      return { ok: false, reason: 'unavailable' }
    }
  }
}

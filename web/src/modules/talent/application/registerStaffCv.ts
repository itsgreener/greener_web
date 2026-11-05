import { TALENT_STAFF_UPLOAD } from '@/modules/talent/domain/talentConstants'
import {
  detectFileKind,
  extensionMatchesKind,
} from '@/modules/talent/domain/talentFileKind'
import type {
  TalentAdminRepository,
  TalentFileStorage,
} from '@/modules/talent/domain/talentPorts'
import {
  buildStaffUploadRow,
  extensionOfStoragePath,
} from '@/modules/talent/domain/talentRows'

import type { FileRejection } from './talentResults'

export type RegisterStaffCvResult =
  | { ok: true; candidateId: string; bytes: number }
  | { ok: false; reason: 'file_rejected'; rejection: FileRejection }
  | { ok: false; reason: 'unavailable' }

/**
 * Segundo paso de la subida de un CV por el personal (ABM): el navegador ya ha
 * subido el fichero al bucket con la URL de `prepareStaffCvUpload` y devuelve
 * su ruta. Aquí se lee el objeto desde Storage, se comprueba tamaño, extensión
 * Y contenido (lo que el fichero ES, no lo que dice ser), y solo entonces nace
 * una fila nueva en `candidates` con `status = 'pending'`.
 *
 * **Sin antivirus**, a diferencia del formulario público (decidido el 5 nov
 * 2026): quien sube es personal de Greener con sesión de admin. **No lanza el
 * procesado**: eso se hace una vez por lote (`processPendingCvs`), porque el
 * workflow procesa todas las `pending`.
 *
 * Un fichero que no pasa la comprobación se BORRA del bucket, y también si
 * falla la fila: no se deja ningún CV huérfano.
 */
export function makeRegisterStaffCv({
  admin,
  storage,
}: {
  admin: TalentAdminRepository
  storage: TalentFileStorage
}) {
  async function discard(path: string) {
    await storage.remove(path).catch((cleanupError) => {
      console.error('Talent: objeto huérfano en el bucket', path, cleanupError)
    })
  }

  return async function registerStaffCv(
    path: string,
    uploadedBy: string,
  ): Promise<RegisterStaffCvResult> {
    // La ruta la manda el navegador: solo vale la forma exacta que genera
    // `prepareStaffCvUpload`. Sin esto, el admin podría registrar (o, al
    // rechazar, borrar) cualquier otro objeto del bucket.
    const extension = extensionOfStoragePath(path)

    if (!extension) {
      return { ok: false, reason: 'file_rejected', rejection: 'file_type' }
    }

    let bytes: Uint8Array

    try {
      bytes = await storage.download(path)
    } catch (error) {
      console.error(
        'Talent: no se pudo leer el CV subido por el personal',
        error,
      )

      return { ok: false, reason: 'unavailable' }
    }

    const rejection = rejectionOf(bytes, extension)

    if (rejection) {
      await discard(path)

      return { ok: false, reason: 'file_rejected', rejection }
    }

    try {
      const row = await admin.insertStaffCandidate(
        buildStaffUploadRow(path, uploadedBy),
      )

      return { ok: true, candidateId: row.id, bytes: bytes.byteLength }
    } catch (error) {
      console.error('Talent: no se pudo guardar el CV del personal', error)

      await discard(path)

      return { ok: false, reason: 'unavailable' }
    }
  }
}

function rejectionOf(
  bytes: Uint8Array,
  extension: NonNullable<ReturnType<typeof extensionOfStoragePath>>,
): FileRejection | null {
  if (bytes.byteLength === 0) return 'file_empty'
  if (bytes.byteLength > TALENT_STAFF_UPLOAD.maxFileBytes) {
    return 'file_too_large'
  }

  const kind = detectFileKind(bytes)

  return kind && extensionMatchesKind(extension, kind) ? null : 'file_type'
}

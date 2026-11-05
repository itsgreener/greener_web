import { TALENT_STAFF_UPLOAD } from '@/modules/talent/domain/talentConstants'
import {
  allowedExtensionOf,
  contentTypeOfExtension,
} from '@/modules/talent/domain/talentFileKind'
import type { TalentFileStorage } from '@/modules/talent/domain/talentPorts'
import { buildStoragePath } from '@/modules/talent/domain/talentRows'

import type { FileRejection } from './talentResults'

export type PrepareStaffCvUploadResult =
  | {
      ok: true
      /** Ruta del objeto en el bucket: es lo que se devuelve a `registerStaffCv`. */
      path: string
      /** URL de escritura de un solo uso: el navegador sube el fichero a ella. */
      signedUrl: string
      /** Tipo con el que hay que subirlo (el que corresponde a la extensión). */
      contentType: string
    }
  | { ok: false; reason: 'file_rejected'; rejection: FileRejection }
  | { ok: false; reason: 'unavailable' }

/**
 * Primer paso de la subida de un CV por el personal (ABM): el fichero NO pasa
 * por el servidor (Vercel corta las peticiones a una función a ~4,5 MB y aquí
 * se admiten hasta 10 MB), así que se entrega al navegador una URL firmada para
 * que lo suba directo al bucket `cvs`. El nombre del fichero no llega a
 * Storage: la ruta es `uploads/<uuid>.<ext>`.
 *
 * Solo comprueba lo que el navegador declara (extensión y tamaño). Lo que el
 * fichero ES se comprueba en el segundo paso (`registerStaffCv`), cuando ya
 * está en el bucket y se pueden leer sus bytes.
 */
export function makePrepareStaffCvUpload({
  storage,
  newId,
}: {
  storage: TalentFileStorage
  newId: () => string
}) {
  return async function prepareStaffCvUpload(file: {
    name: string
    size: number
  }): Promise<PrepareStaffCvUploadResult> {
    if (!Number.isFinite(file.size) || file.size <= 0) {
      return { ok: false, reason: 'file_rejected', rejection: 'file_empty' }
    }

    if (file.size > TALENT_STAFF_UPLOAD.maxFileBytes) {
      return { ok: false, reason: 'file_rejected', rejection: 'file_too_large' }
    }

    const extension = allowedExtensionOf(file.name)

    if (!extension) {
      return { ok: false, reason: 'file_rejected', rejection: 'file_type' }
    }

    const path = buildStoragePath(newId(), extension)

    try {
      return {
        ok: true,
        path,
        signedUrl: await storage.createSignedUploadUrl(path),
        contentType: contentTypeOfExtension(extension),
      }
    } catch (error) {
      console.error('Talent: no se pudo preparar la subida del CV', error)

      return { ok: false, reason: 'unavailable' }
    }
  }
}

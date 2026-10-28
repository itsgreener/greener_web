'use server'

import { revalidatePath } from 'next/cache'
import { ADMIN_REQUIRED_MESSAGE, isAdminRequest } from '@/lib/auth/adminSession'

import { invalidatePackageCache } from '@/lib/cache/packageCache'
import { isUuid } from '@/lib/validation/uuid'

import { adminErrorMessage } from '@/app/admin/_lib/adminErrorMessage'

import {
  deleteHtmlPackageVersion,
  deleteOldHtmlPackageVersions,
  prepareHtmlPackageUpload,
  publishHtmlPackageVersion,
  uploadStagedHtmlPackage,
} from '@/modules/packages/container'
import {
  PackageValidationError,
  VirusScanError,
} from '@/modules/packages/domain/packageErrors'
import {
  deleteHtmlPackageVersionSchema,
  publishHtmlPackageVersionSchema,
} from '@/modules/packages/domain/packageVersionSchema'

export type UploadPackageActionState = {
  error?: string
  issues?: string[]
  success?: boolean
}

export type PublishPackageActionState = {
  error?: string
  success?: boolean
}

export type DeletePackageActionState = {
  error?: string
  warning?: string
  success?: boolean
}

function revalidateContent(id: string) {
  revalidatePath(`/admin/contents/${id}/edit`)
  invalidatePackageCache()
}

export type PrepareUploadResult =
  | { ok: true; bucket: string; path: string; token: string }
  | { ok: false; error: string }

/**
 * Primer paso de la subida de un paquete: entrega al navegador una URL firmada
 * para que suba el ZIP directamente a Storage. El ZIP no pasa por esta
 * función: la plataforma limita el cuerpo de una petición a unos 4,5 MB y un
 * paquete puede llegar a 3,5 MB, justo bajo ese límite una vez sumado el
 * resto de la petición.
 */
export async function prepareHtmlPackageUploadAction(
  contentId: string,
): Promise<PrepareUploadResult> {
  if (!(await isAdminRequest())) {
    return { ok: false, error: ADMIN_REQUIRED_MESSAGE }
  }

  if (!isUuid(contentId)) {
    return { ok: false, error: 'El identificador del contenido no es válido.' }
  }

  try {
    const target = await prepareHtmlPackageUpload(contentId)

    return { ok: true, ...target }
  } catch (error) {
    console.error('Admin · prepareHtmlPackageUploadAction:', error)

    return { ok: false, error: 'No se ha podido preparar la subida.' }
  }
}

/**
 * Segundo paso: el ZIP ya está en Storage (`stagedPath`); se lee desde allí,
 * se valida, se escanea y se crea la versión en borrador.
 */
export async function uploadHtmlPackageAction(
  _previousState: UploadPackageActionState,
  formData: FormData,
): Promise<UploadPackageActionState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const contentId = formData.get('contentId')
  const stagedPath = formData.get('stagedPath')

  // uuid y no «cualquier texto»: la ruta de Storage se forma con este valor
  // (SEC-ADM-B2).
  if (!isUuid(contentId)) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  if (typeof stagedPath !== 'string' || stagedPath === '') {
    return { error: 'Selecciona un archivo ZIP.' }
  }

  try {
    await uploadStagedHtmlPackage(contentId, stagedPath)
  } catch (error) {
    console.error('Admin · uploadHtmlPackageAction:', error)

    if (error instanceof PackageValidationError) {
      return {
        error: 'El ZIP no cumple el contrato de paquete.',
        issues: error.issues,
      }
    }

    if (error instanceof VirusScanError) {
      return {
        error: error.message,
      }
    }

    return { error: 'No se ha podido subir el paquete.' }
  }

  revalidateContent(contentId)

  return { success: true }
}

export async function publishHtmlPackageVersionAction(
  _previousState: PublishPackageActionState,
  formData: FormData,
): Promise<PublishPackageActionState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const result = publishHtmlPackageVersionSchema.safeParse({
    contentId: formData.get('contentId'),
    versionId: formData.get('versionId'),
  })

  if (!result.success) {
    return { error: 'Los datos de la versión no son válidos.' }
  }

  try {
    await publishHtmlPackageVersion(result.data)
  } catch (error) {
    console.error('Admin · publishHtmlPackageVersionAction:', error)

    return { error: 'No se ha podido publicar esta versión.' }
  }

  revalidateContent(result.data.contentId)

  return { success: true }
}

// La base de datos rechaza las versiones que no se pueden borrar (la activa,
// o una que no es de este paquete).
function userFacingDeleteError(error: unknown): string {
  return adminErrorMessage(
    error,
    'No se ha podido borrar la versión.',
    ['active_version_undeletable'],
    { media_not_owned: 'La versión no pertenece a este paquete' },
  )
}

function storageWarning(count: number): string {
  return `La versión se ha borrado, pero ${count} fichero(s) no se han podido borrar de Storage y han quedado huérfanos. Si vuelves a subir un paquete con ese mismo número de versión, la subida puede fallar.`
}

export async function deleteHtmlPackageVersionAction(
  _previousState: DeletePackageActionState,
  formData: FormData,
): Promise<DeletePackageActionState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const result = deleteHtmlPackageVersionSchema.safeParse({
    contentId: formData.get('contentId'),
    versionId: formData.get('versionId'),
  })

  if (!result.success) {
    return { error: 'Los datos de la versión no son válidos.' }
  }

  let outcome: Awaited<ReturnType<typeof deleteHtmlPackageVersion>>

  try {
    outcome = await deleteHtmlPackageVersion(result.data)
  } catch (error) {
    console.error('Admin · deleteHtmlPackageVersionAction:', error)

    return { error: userFacingDeleteError(error) }
  }

  revalidateContent(result.data.contentId)

  if (outcome.storageFailed > 0) {
    return { success: true, warning: storageWarning(outcome.storageFailed) }
  }

  return { success: true }
}

export async function deleteOldHtmlPackageVersionsAction(
  _previousState: DeletePackageActionState,
  formData: FormData,
): Promise<DeletePackageActionState> {
  if (!(await isAdminRequest())) return { error: ADMIN_REQUIRED_MESSAGE }

  const result = deleteHtmlPackageVersionSchema
    .pick({ contentId: true })
    .safeParse({ contentId: formData.get('contentId') })

  if (!result.success) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  let outcome: Awaited<ReturnType<typeof deleteOldHtmlPackageVersions>>

  try {
    outcome = await deleteOldHtmlPackageVersions(result.data.contentId)
  } catch (error) {
    console.error('Admin · deleteOldHtmlPackageVersionsAction:', error)

    return { error: 'No se han podido leer las versiones del paquete.' }
  }

  revalidateContent(result.data.contentId)

  if (outcome.total === 0) {
    return { error: 'No hay versiones anteriores que borrar.' }
  }

  if (outcome.error) {
    console.error(outcome.error)

    return {
      error: `Se han borrado ${outcome.deleted} de ${outcome.total} versiones anteriores; el borrado se ha detenido por un error. ${userFacingDeleteError(outcome.error)}`,
    }
  }

  if (outcome.storageFailed > 0) {
    return {
      success: true,
      warning: storageWarning(outcome.storageFailed),
    }
  }

  return { success: true }
}

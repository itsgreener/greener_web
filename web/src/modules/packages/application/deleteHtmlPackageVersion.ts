import { z } from 'zod'

import { supabaseHtmlPackageRepository } from '../infrastructure/supabaseHtmlPackageRepository'
import { idSchema } from '@/lib/validation/idSchema'

export const deleteHtmlPackageVersionSchema = z.object({
  contentId: idSchema('content'),
  versionId: idSchema('version'),
})

export type DeleteHtmlPackageVersionInput = z.infer<
  typeof deleteHtmlPackageVersionSchema
>

export async function deleteHtmlPackageVersion(
  input: DeleteHtmlPackageVersionInput,
) {
  const validated = deleteHtmlPackageVersionSchema.parse(input)

  return supabaseHtmlPackageRepository.deleteVersion(validated)
}

export type DeleteOldVersionsResult = {
  /** Versiones borradas. */
  deleted: number
  /** Ficheros de Storage que no se pudieron borrar, sumados de todas. */
  storageFailed: number
  /** Si se detuvo por un error, la causa (las ya borradas se mantienen). */
  error?: unknown
  /** Total de versiones que se intentaban borrar. */
  total: number
}

/**
 * Borra todas las versiones ANTERIORES (`rolled_back`) de un paquete. Los
 * borradores y la versión activa no se tocan: un borrador es trabajo
 * pendiente, no una versión anterior. Una a una, deteniéndose al primer error.
 */
export async function deleteOldHtmlPackageVersions(
  contentId: string,
): Promise<DeleteOldVersionsResult> {
  const validated = deleteHtmlPackageVersionSchema
    .pick({ contentId: true })
    .parse({ contentId })

  const versions = await supabaseHtmlPackageRepository.listVersions(
    validated.contentId,
  )

  const old = versions.filter((version) => version.status === 'rolled_back')

  const result: DeleteOldVersionsResult = {
    deleted: 0,
    storageFailed: 0,
    total: old.length,
  }

  for (const version of old) {
    try {
      const { storageFailed } =
        await supabaseHtmlPackageRepository.deleteVersion({
          contentId: validated.contentId,
          versionId: version.id,
        })

      result.deleted += 1
      result.storageFailed += storageFailed
    } catch (error) {
      result.error = error
      break
    }
  }

  return result
}

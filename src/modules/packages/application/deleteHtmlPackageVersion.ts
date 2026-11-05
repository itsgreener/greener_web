import type {
  DeleteHtmlPackageVersionInput,
  HtmlPackageRepository,
} from '@/modules/packages/domain/htmlPackageRepository'
import { deleteHtmlPackageVersionSchema } from '@/modules/packages/domain/packageVersionSchema'

export function makeDeleteHtmlPackageVersion({
  packages,
}: {
  packages: HtmlPackageRepository
}) {
  return async function deleteHtmlPackageVersion(
    input: DeleteHtmlPackageVersionInput,
  ) {
    const validated = deleteHtmlPackageVersionSchema.parse(input)

    return packages.deleteVersion(validated)
  }
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
export function makeDeleteOldHtmlPackageVersions({
  packages,
}: {
  packages: HtmlPackageRepository
}) {
  return async function deleteOldHtmlPackageVersions(
    contentId: string,
  ): Promise<DeleteOldVersionsResult> {
    const validated = deleteHtmlPackageVersionSchema
      .pick({ contentId: true })
      .parse({ contentId })

    const versions = await packages.listVersions(validated.contentId)

    const old = versions.filter((version) => version.status === 'rolled_back')

    const result: DeleteOldVersionsResult = {
      deleted: 0,
      storageFailed: 0,
      total: old.length,
    }

    for (const version of old) {
      try {
        const { storageFailed } = await packages.deleteVersion({
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
}

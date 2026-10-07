import type { PackageManifestInput } from './manifestSchema'

export type HtmlPackageVersionStatus = 'draft' | 'published' | 'rolled_back'

export type HtmlPackageVersionSummary = {
  id: string
  version: number
  status: HtmlPackageVersionStatus
  createdAt: string
  storagePath: string
}

export type UploadHtmlPackageVersionInput = {
  contentId: string
  entries: Array<{ path: string; data: Buffer }>
  manifest: PackageManifestInput
  checksum: string
}

export type PublishHtmlPackageVersionInput = {
  contentId: string
  versionId: string
}

export type DeleteHtmlPackageVersionInput = {
  contentId: string
  versionId: string
}

export type DeleteHtmlPackageVersionResult = {
  storagePath: string
  /** Ficheros que no se pudieron borrar de Storage (0 si todo fue bien). */
  storageFailed: number
}

export interface HtmlPackageRepository {
  /** Sube los ficheros a Storage y crea la versión en estado 'draft'. */
  uploadVersion(input: UploadHtmlPackageVersionInput): Promise<string>

  /** Hace que una versión (nueva o antigua — rollback) sea la actual. */
  publishVersion(input: PublishHtmlPackageVersionInput): Promise<string>

  listVersions(contentId: string): Promise<HtmlPackageVersionSummary[]>

  /**
   * Borra una versión que NO sea la activa (la base de datos lo exige) y,
   * después, sus ficheros de Storage (best-effort: un fallo ahí no deshace
   * el borrado de la fila, se cuenta en `storageFailed`).
   */
  deleteVersion(
    input: DeleteHtmlPackageVersionInput,
  ): Promise<DeleteHtmlPackageVersionResult>
}

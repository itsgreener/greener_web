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

export interface HtmlPackageRepository {
  /** Sube los ficheros a Storage y crea la versión en estado 'draft'. */
  uploadVersion(input: UploadHtmlPackageVersionInput): Promise<string>

  /** Hace que una versión (nueva o antigua — rollback) sea la actual. */
  publishVersion(input: PublishHtmlPackageVersionInput): Promise<string>

  listVersions(contentId: string): Promise<HtmlPackageVersionSummary[]>
}

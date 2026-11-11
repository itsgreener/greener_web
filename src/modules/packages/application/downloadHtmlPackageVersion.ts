import {
  MAX_PACKAGE_DOWNLOAD_BYTES,
  packageDownloadFileName,
  type HtmlPackageVersionReader,
  type PackageZipBuilder,
} from '@/modules/packages/domain/packageDownload'
import { PackageDownloadTooLargeError } from '@/modules/packages/domain/packageErrors'
import { downloadHtmlPackageVersionSchema } from '@/modules/packages/domain/packageVersionSchema'

export type DownloadedPackageVersion = {
  /** `<slug>-v<n>.zip` */
  fileName: string
  zip: Buffer
}

/**
 * Reconstruye el ZIP de una versión (la activa, un borrador o una anterior).
 *
 * Devuelve `null` si la versión no existe, no es de ese contenido o no tiene
 * ficheros. No toca nada: es una lectura.
 *
 * @throws ZodError si los identificadores no son uuid
 * @throws PackageDownloadTooLargeError si el ZIP no cabe en una respuesta
 */
export function makeDownloadHtmlPackageVersion({
  reader,
  zipBuilder,
}: {
  reader: HtmlPackageVersionReader
  zipBuilder: PackageZipBuilder
}) {
  return async function downloadHtmlPackageVersion(
    input: unknown,
  ): Promise<DownloadedPackageVersion | null> {
    const { contentId, versionId } =
      downloadHtmlPackageVersionSchema.parse(input)

    const found = await reader.read(contentId, versionId)

    if (!found || found.files.length === 0) return null

    const zip = zipBuilder.build(found.files)

    if (zip.byteLength > MAX_PACKAGE_DOWNLOAD_BYTES) {
      throw new PackageDownloadTooLargeError(zip.byteLength)
    }

    return {
      fileName: packageDownloadFileName(found.slug, found.version),
      zip,
    }
  }
}

import type { HtmlPackageRepository } from '@/modules/packages/domain/htmlPackageRepository'
import type {
  PackageZipValidator,
  VirusScanner,
} from '@/modules/packages/domain/packageUploadPorts'

/**
 * Valida el ZIP, lo escanea y, solo si está limpio, crea la versión en
 * borrador.
 *
 * @throws PackageValidationError si el ZIP no cumple el contrato
 * @throws VirusScanError si el antivirus no lo da por limpio
 */
export function makeUploadHtmlPackage({
  packages,
  validator,
  scanner,
}: {
  packages: HtmlPackageRepository
  validator: PackageZipValidator
  scanner: VirusScanner
}) {
  return async function uploadHtmlPackage(contentId: string, zip: Buffer) {
    const { manifest, entries, checksum } = validator.validate(zip)

    // Se escanea el ZIP completo en crudo (no las entradas ya extraídas):
    // es justo lo que exige §12.5 ("Escaneo del ZIP antes de publicar en
    // Storage") y evita reconstruir el archivo original a partir de las
    // entradas ya descomprimidas.
    await scanner.scan(zip)

    return packages.uploadVersion({
      contentId,
      entries,
      manifest,
      checksum,
    })
  }
}

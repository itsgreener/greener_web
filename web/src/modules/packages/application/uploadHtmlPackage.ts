import type { HtmlPackageRepository } from '@/modules/packages/domain/htmlPackageRepository'
import { PackageValidationError } from '@/modules/packages/domain/packageErrors'
import { isStagedPackagePathFor } from '@/modules/packages/domain/packageFiles'
import { PACKAGE_LIMITS } from '@/modules/packages/domain/packageLimits'
import type {
  PackageUploadStaging,
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

/**
 * Prepara la subida directa: la URL firmada a la que el navegador sube el ZIP.
 */
export function makePrepareHtmlPackageUpload({
  staging,
}: {
  staging: PackageUploadStaging
}) {
  return function prepareHtmlPackageUpload(contentId: string) {
    return staging.createUploadTarget(contentId)
  }
}

/**
 * Procesa un ZIP que el navegador ya subió a la zona de paso: lo lee desde
 * Storage y lo pasa por `uploadHtmlPackage`. La subida se borra siempre, haya
 * ido bien o mal.
 *
 * @throws PackageValidationError si la ruta no es una subida de este contenido,
 *   si el ZIP supera el tope o si no cumple el contrato
 * @throws VirusScanError si el antivirus no lo da por limpio
 */
export function makeUploadStagedHtmlPackage({
  staging,
  upload,
}: {
  staging: PackageUploadStaging
  upload: (contentId: string, zip: Buffer) => Promise<string>
}) {
  return async function uploadStagedHtmlPackage(
    contentId: string,
    stagedPath: unknown,
  ) {
    if (!isStagedPackagePathFor(contentId, stagedPath)) {
      throw new PackageValidationError([
        'La subida no es válida. Vuelve a seleccionar el archivo.',
      ])
    }

    try {
      const zip = await staging.read(stagedPath)

      if (zip.byteLength > PACKAGE_LIMITS.maxZipSizeBytes) {
        throw new PackageValidationError([
          `El ZIP supera el límite de ${PACKAGE_LIMITS.maxZipSizeBytes / 1_000_000} MB.`,
        ])
      }

      return await upload(contentId, zip)
    } finally {
      await staging.discard(stagedPath)
    }
  }
}

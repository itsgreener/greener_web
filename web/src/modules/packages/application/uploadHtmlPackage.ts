import { validateHtmlPackageZip } from '../infrastructure/zipValidation'
import { scanZipForViruses } from '../infrastructure/cloudmersiveVirusScan'
import { supabaseHtmlPackageRepository } from '../infrastructure/supabaseHtmlPackageRepository'

export async function uploadHtmlPackage(contentId: string, zipBuffer: Buffer) {
  const { manifest, entries, checksum } = validateHtmlPackageZip(zipBuffer)

  // Se escanea el ZIP completo en crudo (no las entradas ya extraídas):
  // es justo lo que exige §12.5 ("Escaneo del ZIP antes de publicar en
  // Storage") y evita reconstruir el archivo original a partir de las
  // entradas ya descomprimidas.
  await scanZipForViruses(zipBuffer)

  return supabaseHtmlPackageRepository.uploadVersion({
    contentId,
    entries,
    manifest,
    checksum,
  })
}

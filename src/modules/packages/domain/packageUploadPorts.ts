import type { PackageManifestInput } from './manifestSchema'

export type ValidatedPackageEntry = {
  path: string
  data: Buffer
}

export type ValidatedPackage = {
  manifest: PackageManifestInput
  entries: ValidatedPackageEntry[]
  checksum: string
}

/** Comprueba que un ZIP cumple el contrato de paquete. */
export interface PackageZipValidator {
  /** @throws PackageValidationError */
  validate(zip: Buffer): ValidatedPackage
}

/** Escanea el ZIP completo en busca de virus antes de publicarlo. */
export interface VirusScanner {
  /** @throws VirusScanError si no está limpio o no se pudo comprobar */
  scan(zip: Buffer): Promise<void>
}

/** Destino al que el navegador sube el ZIP directamente (URL firmada). */
export type PackageUploadTarget = {
  bucket: string
  path: string
  token: string
}

/** Una subida preparada que sigue en la zona de paso. */
export type StagedUploadFile = {
  path: string
  /** Fecha de creación en ms; `null` si Storage no la da (no se borra). */
  createdAt: number | null
}

/** Recorre y limpia la zona de paso (tarea programada, sin sesión de admin). */
export interface StagedUploadSweeper {
  /** Subidas preparadas de hasta `maxFolders` contenidos. `truncated` = quedan más. */
  listStaged(
    maxFolders: number,
  ): Promise<{ files: StagedUploadFile[]; truncated: boolean }>

  /** Borra esas rutas y devuelve cuántas se borraron. @throws si Storage falla */
  remove(paths: string[]): Promise<number>
}

/**
 * Zona de paso del ZIP entre el navegador y la acción: el navegador sube ahí
 * (sin pasar por la función) y la acción lo lee desde el servidor.
 */
export interface PackageUploadStaging {
  createUploadTarget(contentId: string): Promise<PackageUploadTarget>

  /** El ZIP subido a `path`. */
  read(path: string): Promise<Buffer>

  /** Borra la subida; si falla no se propaga (queda un fichero suelto). */
  discard(path: string): Promise<void>
}

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

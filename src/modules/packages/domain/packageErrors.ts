/** El ZIP no cumple el contrato de paquete. Los `issues` se muestran al admin. */
export class PackageValidationError extends Error {
  issues: string[]

  constructor(issues: string[]) {
    super(issues.join(' — '))
    this.name = 'PackageValidationError'
    this.issues = issues
  }
}

/** El antivirus no dio el ZIP por limpio (o no pudo comprobarlo). */
export class VirusScanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VirusScanError'
  }
}

/**
 * El ZIP reconstruido de una versión pesa más de lo que la plataforma deja
 * devolver en una respuesta (`MAX_PACKAGE_DOWNLOAD_BYTES`). Es un aviso para
 * el admin, no un fallo del servicio: lleva el tamaño para poder decirlo.
 */
export class PackageDownloadTooLargeError extends Error {
  bytes: number

  constructor(bytes: number) {
    super(`El ZIP reconstruido pesa ${bytes} bytes`)
    this.name = 'PackageDownloadTooLargeError'
    this.bytes = bytes
  }
}

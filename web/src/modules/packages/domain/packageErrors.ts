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

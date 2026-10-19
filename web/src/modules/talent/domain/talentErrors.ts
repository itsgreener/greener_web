/** Ya existe un candidato con ese email (índice único). */
export class DuplicateCandidateEmailError extends Error {
  constructor() {
    super('A candidate with this email already exists.')

    this.name = 'DuplicateCandidateEmailError'
  }
}

/** El antivirus no dio el fichero por limpio (o no pudo comprobarlo). */
export class FileScanRejectedError extends Error {
  constructor() {
    super('The file could not be confirmed as clean.')

    this.name = 'FileScanRejectedError'
  }
}

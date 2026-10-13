export class UnsupportedScopeError extends Error {
  constructor(scope: string) {
    super(`El scope '${scope}' no está soportado.`)
    this.name = 'UnsupportedScopeError'
  }
}

export class FeedSessionNotFoundError extends Error {
  constructor() {
    super('La sesión de feed no existe o ha caducado.')
    this.name = 'FeedSessionNotFoundError'
  }
}

export class InvalidFeedCursorError extends Error {
  constructor() {
    super('El cursor no es válido para esta sesión.')
    this.name = 'InvalidFeedCursorError'
  }
}

/**
 * Fallos de negocio que el resto de la aplicación necesita distinguir.
 *
 * Los produce la infraestructura (hoy, traduciendo el SQLSTATE que devuelve
 * Postgres, ver `lib/supabase/postgresErrors.ts`) y los consumen las acciones
 * y los casos de uso por `kind`, nunca comparando el texto de un mensaje.
 * Cada `kind` es un caso que la interfaz sabe explicar; lo que no está aquí
 * es un fallo inesperado y se trata como tal.
 */
export const DOMAIN_ERROR_KINDS = [
  // Genéricos
  'unauthorized',
  'not_found',
  'duplicate',
  'media_in_use',
  'validation_rejected',
  // Pines y medios
  'pin_label_required',
  'pin_media_limit',
  'image_too_large',
  'video_too_large',
  'video_too_long',
  'media_not_owned',
  // Contenido
  'not_a_case',
  'not_an_episode',
  'episode_locale_only',
  'only_draft_deletable',
  // Publicación y paquetes
  'package_required',
  'other_kind_required',
  'page_pin_required',
  'publish_date_in_past',
  'active_version_undeletable',
] as const

export type DomainErrorKind = (typeof DOMAIN_ERROR_KINDS)[number]

export class DomainError extends Error {
  readonly kind: DomainErrorKind

  /** SQLSTATE original, si el fallo vino de la base de datos. */
  readonly code?: string

  constructor(kind: DomainErrorKind, message: string, code?: string) {
    super(message)

    this.name = 'DomainError'
    this.kind = kind
    this.code = code
  }
}

/** ¿Es un `DomainError` (y, si se indica, de ese `kind`)? */
export function isDomainError(
  error: unknown,
  kind?: DomainErrorKind,
): error is DomainError {
  return (
    error instanceof DomainError && (kind === undefined || error.kind === kind)
  )
}

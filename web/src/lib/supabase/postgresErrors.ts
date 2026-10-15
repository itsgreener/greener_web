import {
  DomainError,
  type DomainErrorKind,
} from '@/modules/shared/domain/domainError'

/**
 * Traducción de errores de Postgres a errores de dominio.
 *
 * Es el ÚNICO sitio que conoce los SQLSTATE de la aplicación. Los códigos
 * `ZG0xx` los lanzan las funciones de la base de datos con
 * `raise exception ... using errcode = 'ZG0xx'` (migración
 * 20261009120000_typed_error_codes.sql); los demás son SQLSTATE estándar.
 * Para añadir un aviso nuevo: un código en la función SQL, una línea aquí y un
 * `kind` en `shared/domain/domainError.ts`.
 */
const KIND_BY_SQLSTATE: Readonly<Record<string, DomainErrorKind>> = {
  '42501': 'unauthorized',
  P0002: 'not_found',
  '23505': 'duplicate',
  '23503': 'media_in_use',
  '22023': 'validation_rejected',
  ZG001: 'pin_label_required',
  ZG002: 'image_too_large',
  ZG003: 'video_too_large',
  ZG004: 'video_too_long',
  ZG005: 'pin_media_limit',
  ZG006: 'not_a_case',
  ZG007: 'not_an_episode',
  ZG008: 'episode_locale_only',
  ZG009: 'package_required',
  ZG010: 'publish_date_in_past',
  ZG017: 'other_kind_required',
  ZG018: 'page_pin_required',
  ZG013: 'stale_reference',
  ZG014: 'media_not_owned',
  ZG015: 'only_draft_deletable',
  ZG016: 'active_version_undeletable',
}

/**
 * Compatibilidad con una base de datos que aún no tiene la migración de
 * códigos: sus funciones lanzaban `P0001`/`22023` con estos textos. Solo se
 * consulta cuando el SQLSTATE no es uno de los de arriba. Se puede borrar
 * cuando la migración 20261009120000 esté aplicada en todos los entornos.
 */
const LEGACY_KIND_BY_MESSAGE: ReadonlyArray<
  readonly [RegExp, DomainErrorKind]
> = [
  [/rótulo del pin es obligatorio/, 'pin_label_required'],
  [/Image is too large/, 'image_too_large'],
  [/Video is too large/, 'video_too_large'],
  [/(Video|Animation) is too long/, 'video_too_long'],
  [/admite hasta 8 medios/, 'pin_media_limit'],
  [/Content is not a case/, 'not_a_case'],
  [/Content is not an episode/, 'not_an_episode'],
  [/Episode only supports its default locale/, 'episode_locale_only'],
  [/no tiene un paquete HTML publicado/, 'package_required'],
  [/debe ser futura/, 'publish_date_in_past'],
  [/ya no apunta/, 'stale_reference'],
  [/no pertenece a este/, 'media_not_owned'],
  [/Only draft content can be deleted/, 'only_draft_deletable'],
  [/No se puede borrar la versión activa/, 'active_version_undeletable'],
]

const LEGACY_SQLSTATES = new Set(['P0001', '22023'])

export function mapPostgresError(
  message: string,
  code?: string,
): DomainError | null {
  if (code === undefined) {
    return null
  }

  const legacy = LEGACY_SQLSTATES.has(code)
    ? LEGACY_KIND_BY_MESSAGE.find(([pattern]) => pattern.test(message))?.[1]
    : undefined

  const kind = legacy ?? KIND_BY_SQLSTATE[code]

  return kind ? new DomainError(kind, message, code) : null
}

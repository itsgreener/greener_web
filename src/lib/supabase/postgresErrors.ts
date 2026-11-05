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
 *
 * Retirados: ZG011, ZG012 y ZG013, que solo lanzaban las funciones de la
 * portada de `other`, borradas el 15 oct 2026 (20261015130000). El
 * respaldo que traducía por texto los mensajes de las bases sin la migración
 * de códigos se retiró el 19 oct 2026: esa migración es requisito.
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
  ZG014: 'media_not_owned',
  ZG015: 'only_draft_deletable',
  ZG016: 'active_version_undeletable',
}

export function mapPostgresError(
  message: string,
  code?: string,
): DomainError | null {
  if (code === undefined) {
    return null
  }

  const kind = KIND_BY_SQLSTATE[code]

  return kind ? new DomainError(kind, message, code) : null
}

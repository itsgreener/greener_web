import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { mapPostgresError } from '@/lib/supabase/postgresErrors'
import { createRepositoryError } from '@/lib/supabase/repositoryError'
import {
  DOMAIN_ERROR_KINDS,
  isDomainError,
  type DomainErrorKind,
} from '@/modules/shared/domain/domainError'

const BY_CODE: ReadonlyArray<readonly [string, DomainErrorKind]> = [
  ['42501', 'unauthorized'],
  ['P0002', 'not_found'],
  ['23505', 'duplicate'],
  ['23503', 'media_in_use'],
  ['22023', 'validation_rejected'],
  ['ZG001', 'pin_label_required'],
  ['ZG002', 'image_too_large'],
  ['ZG003', 'video_too_large'],
  ['ZG004', 'video_too_long'],
  ['ZG005', 'pin_media_limit'],
  ['ZG006', 'not_a_case'],
  ['ZG007', 'not_an_episode'],
  ['ZG008', 'episode_locale_only'],
  ['ZG009', 'package_required'],
  ['ZG010', 'publish_date_in_past'],
  ['ZG011', 'cover_unsupported'],
  ['ZG012', 'cover_video_unsupported'],
  ['ZG013', 'stale_reference'],
  ['ZG014', 'media_not_owned'],
  ['ZG015', 'only_draft_deletable'],
  ['ZG016', 'active_version_undeletable'],
]

describe('mapPostgresError — por SQLSTATE', () => {
  it.each(BY_CODE)('%s → %s, sin leer el mensaje', (code, kind) => {
    const error = mapPostgresError('cualquier texto', code)

    expect(error?.kind).toBe(kind)
    expect(error?.code).toBe(code)
    expect(error?.message).toBe('cualquier texto')
  })

  it('un SQLSTATE desconocido, P0001 sin texto reconocible o sin código no es un caso de negocio', () => {
    expect(mapPostgresError('boom', '08006')).toBeNull()
    expect(mapPostgresError('algo raro', 'P0001')).toBeNull()
    expect(mapPostgresError('Image is too large')).toBeNull()
  })

  it('todos los tipos de DomainError tienen al menos un SQLSTATE, salvo los que no vienen de la base', () => {
    const mapped = new Set(BY_CODE.map(([, kind]) => kind))

    expect(DOMAIN_ERROR_KINDS.filter((kind) => !mapped.has(kind))).toEqual([])
  })
})

describe('mapPostgresError — base de datos sin la migración de códigos', () => {
  it.each([
    ['22023', 'Image is too large', 'image_too_large'],
    ['22023', 'Video is too large', 'video_too_large'],
    ['22023', 'Animation is too long', 'video_too_long'],
    ['22023', 'Video is too long', 'video_too_long'],
    [
      '22023',
      'El rótulo del pin es obligatorio para este tipo de contenido',
      'pin_label_required',
    ],
    ['P0001', 'Un pin admite hasta 8 medios', 'pin_media_limit'],
    ['P0001', 'Content is not a case', 'not_a_case'],
    ['P0001', 'Content is not an episode', 'not_an_episode'],
    [
      'P0001',
      'Episode only supports its default locale',
      'episode_locale_only',
    ],
    [
      'P0001',
      'Esta tool/insight no tiene un paquete HTML publicado — no se puede publicar sin él',
      'package_required',
    ],
    [
      '22023',
      'La fecha de publicación debe ser futura',
      'publish_date_in_past',
    ],
    [
      'P0001',
      'Content type does not support a cover image',
      'cover_unsupported',
    ],
    [
      'P0001',
      'Only free-form content supports a cover video',
      'cover_video_unsupported',
    ],
    [
      'P0001',
      'El contenido ya no apunta a este medio (posible carrera con otra pestaña)',
      'stale_reference',
    ],
    ['P0001', 'Este medio no pertenece a este pin', 'media_not_owned'],
    ['P0001', 'Only draft content can be deleted', 'only_draft_deletable'],
    [
      'P0001',
      'No se puede borrar la versión activa. Publica otra versión antes.',
      'active_version_undeletable',
    ],
  ] as const)('%s «%s» → %s', (code, message, kind) => {
    expect(mapPostgresError(message, code)?.kind).toBe(kind)
  })

  it('un 22023 con otro texto sigue siendo un rechazo de validación', () => {
    expect(
      mapPostgresError('El alt del pin es obligatorio', '22023')?.kind,
    ).toBe('validation_rejected')
  })
})

describe('createRepositoryError', () => {
  it('devuelve un DomainError cuando el código es de negocio', () => {
    const error = createRepositoryError('Content not found', 'P0002')

    expect(isDomainError(error, 'not_found')).toBe(true)
    expect(isDomainError(error, 'duplicate')).toBe(false)
  })

  it('conserva el code en un Error normal cuando no lo es', () => {
    const error = createRepositoryError('connection reset', '08006')

    expect(isDomainError(error)).toBe(false)
    expect(error.code).toBe('08006')
    expect(error.message).toBe('connection reset')
  })
})

describe('migración de códigos de error', () => {
  const sql = readFileSync(
    resolve(
      __dirname,
      '../../../supabase/migrations/20261009120000_typed_error_codes.sql',
    ),
    'utf8',
  )

  const used = new Set(
    sql.match(/errcode = 'ZG\d{3}'/g)?.map((m) => m.slice(11, 16)),
  )

  it('usa exactamente los códigos ZG que el mapper conoce', () => {
    const known = BY_CODE.map(([code]) => code).filter((code) =>
      code.startsWith('ZG'),
    )

    expect([...used].sort()).toEqual(known.sort())
  })

  it('no deja ningún aviso reconocido por texto con el SQLSTATE antiguo', () => {
    const stillGeneric = sql.match(
      /raise exception\s*'(?:Image is too large|Video is too (?:large|long)|Animation is too long|Content is not an? (?:case|episode)|Only draft content can be deleted)[^']*'\s*using errcode = '(?:P0001|22023)'/g,
    )

    expect(stillGeneric).toBeNull()
  })
})

import { readdirSync, readFileSync } from 'node:fs'
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
  ['ZG014', 'media_not_owned'],
  ['ZG015', 'only_draft_deletable'],
  ['ZG016', 'active_version_undeletable'],
  ['ZG017', 'other_kind_required'],
  ['ZG018', 'page_pin_required'],
]

describe('mapPostgresError — por SQLSTATE', () => {
  it.each(BY_CODE)('%s → %s, sin leer el mensaje', (code, kind) => {
    const error = mapPostgresError('cualquier texto', code)

    expect(error?.kind).toBe(kind)
    expect(error?.code).toBe(code)
    expect(error?.message).toBe('cualquier texto')
  })

  it('un SQLSTATE desconocido, P0001 (sea cual sea su texto) o sin código no es un caso de negocio', () => {
    expect(mapPostgresError('boom', '08006')).toBeNull()
    expect(mapPostgresError('algo raro', 'P0001')).toBeNull()
    expect(mapPostgresError('Content is not a case', 'P0001')).toBeNull()
    expect(mapPostgresError('Image is too large')).toBeNull()
  })

  it('todos los tipos de DomainError tienen al menos un SQLSTATE, salvo los que no vienen de la base', () => {
    const mapped = new Set(BY_CODE.map(([, kind]) => kind))

    expect(DOMAIN_ERROR_KINDS.filter((kind) => !mapped.has(kind))).toEqual([])
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

describe('migraciones de códigos de error', () => {
  const dir = resolve(__dirname, '../../../supabase/migrations')
  const read = (name: string) => readFileSync(resolve(dir, name), 'utf8')
  const codesIn = (sql: string) =>
    (sql.match(/errcode = 'ZG\d{3}'/g) ?? []).map((m) => m.slice(11, 16))

  const sql = read('20261009120000_typed_error_codes.sql')

  // ZG011 y ZG012 eran los errores de la portada de other, retirada el
  // 15 oct 2026 (20261015130000), y ZG013 lo lanzaba
  // unlink_and_delete_cover_media, borrada ese mismo día. Sus RPC ya no
  // existen y el mapper no los conoce; el texto de la migración original
  // sigue mencionándolos.
  const RETIRED = ['ZG011', 'ZG012', 'ZG013']

  const laterMigrations = readdirSync(dir)
    .filter((name) => name >= '20261015')
    .map(read)

  const used = new Set([
    ...codesIn(sql).filter((code) => !RETIRED.includes(code)),
    ...laterMigrations.flatMap(codesIn),
  ])

  it('usa exactamente los códigos ZG que el mapper conoce', () => {
    const known = BY_CODE.map(([code]) => code).filter((code) =>
      code.startsWith('ZG'),
    )

    expect([...used].sort()).toEqual(known.sort())
  })

  it('los códigos retirados ya no están en el mapper', () => {
    for (const code of RETIRED) {
      expect(mapPostgresError('cualquier texto', code)).toBeNull()
    }
  })

  it('no deja ningún aviso reconocido por texto con el SQLSTATE antiguo', () => {
    const stillGeneric = sql.match(
      /raise exception\s*'(?:Image is too large|Video is too (?:large|long)|Animation is too long|Content is not an? (?:case|episode)|Only draft content can be deleted)[^']*'\s*using errcode = '(?:P0001|22023)'/g,
    )

    expect(stillGeneric).toBeNull()
  })
})

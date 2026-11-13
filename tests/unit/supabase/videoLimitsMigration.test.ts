import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  PIN_ANIMATION_LIMITS,
  TOOL_PIN_VIDEO_LIMITS,
  VIDEO_LIMITS,
} from '@/modules/media/domain/mediaLimits'

/**
 * Migraciones del 13 nov 2026: topes del vídeo de caso (300 s / 125 MB), tope
 * de peso del vídeo de un pin normal (10 MB) y proporción 3:2. Es SQL: aquí se
 * fijan las cifras y que solo cambien esas constantes, no el resto de las
 * funciones.
 */

const dir = join(process.cwd(), 'supabase', 'migrations')
const read = (name: string) =>
  readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n')

const LIMITS = '20261113100000_video_limits_case_300s_125mb_pin_10mb.sql'
const RATIO = '20261113100100_pin_ratio_add_3_2.sql'
const limitsSql = read(LIMITS)

function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`)

  expect(start, `no existe ${name}`).toBeGreaterThan(-1)

  return sql.slice(start, sql.indexOf('\n$$;', start))
}

describe('migración de los topes de vídeo (13 nov 2026)', () => {
  it('define solo las tres funciones implicadas', () => {
    const names = [
      ...limitsSql.matchAll(/create or replace function public\.(\w+)\(/g),
    ].map((match) => match[1])

    expect(names).toEqual([
      'add_case_carousel_video',
      'replace_case_carousel_media',
      'attach_pin_video',
    ])
  })

  it.each(['add_case_carousel_video', 'replace_case_carousel_media'])(
    '%s: duración y peso de VIDEO_LIMITS',
    (name) => {
      const body = functionBody(limitsSql, name)

      expect(body).toContain(
        `p_duration_seconds > ${VIDEO_LIMITS.maxDurationSeconds}`,
      )
      expect(body).toContain(`p_bytes > ${VIDEO_LIMITS.maxSizeBytes}`)
      expect(body).not.toMatch(/p_duration_seconds > 180/)
      expect(body).not.toMatch(/p_bytes > 104857600/)
    },
  )

  it('attach_pin_video: tools 15 s / 15 MB, resto 8 s / 10 MB', () => {
    const body = functionBody(limitsSql, 'attach_pin_video')

    expect(body).toContain(
      `v_max_duration := ${TOOL_PIN_VIDEO_LIMITS.maxDurationSeconds};`,
    )
    expect(body).toContain(
      `v_max_bytes := ${TOOL_PIN_VIDEO_LIMITS.maxSizeBytes};`,
    )
    expect(body).toContain(
      `v_max_duration := ${PIN_ANIMATION_LIMITS.maxDurationSeconds};`,
    )
    expect(body).toContain(
      `v_max_bytes := ${PIN_ANIMATION_LIMITS.maxSizeBytes};`,
    )
  })

  it.each([
    ['add_case_carousel_video', '20261009120000_typed_error_codes.sql'],
    [
      'replace_case_carousel_media',
      '20261109140000_case_carousel_reorder_and_edit.sql',
    ],
    ['attach_pin_video', '20261009120000_typed_error_codes.sql'],
  ])(
    '%s: idéntica a la versión anterior salvo las constantes de tope',
    (name, previousFile) => {
      const normalize = (body: string) =>
        body
          .replace(/p_duration_seconds > (180|300)/g, 'p_duration_seconds > N')
          .replace(/p_bytes > (104857600|131072000)/g, 'p_bytes > N')
          .replace(/v_max_bytes := \d+; -- \d+ MB/g, 'v_max_bytes := N;')

      expect(normalize(functionBody(limitsSql, name))).toBe(
        normalize(functionBody(read(previousFile), name)),
      )
    },
  )

  it('es posterior a las que definían esas funciones', () => {
    expect(LIMITS > '20261111110000_content_pins_as_carousel.sql').toBe(true)
  })
})

describe('migración del ratio 3:2 (13 nov 2026)', () => {
  const sql = read(RATIO)
  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--') && line.trim() !== '')

  it('solo añade el valor al enum, sin usarlo en el mismo fichero', () => {
    expect(statements).toEqual([
      "alter type pin_ratio add value if not exists '3:2';",
    ])
  })
})

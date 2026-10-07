import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  DERIVED_PIN_LABEL_TYPES,
  hasDerivedPinLabel,
} from '@/modules/pin/domain/derivedPinLabel'
import { pinCreationErrorMessage } from '@/modules/pin/application/pinCreationError'

/**
 * Regresión del 7 oct 2026: el rótulo del pin de insight se automatizó en el
 * ABM y en el feed, pero `create_pin` / `update_pin` siguieron exigiéndolo
 * (solo exoneraban case y episode), así que todo alta de un pin de insight
 * fallaba en la base de datos. La lista vive duplicada (TypeScript y SQL) y
 * estos tests impiden que vuelvan a separarse sin que nada avise.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

/** Texto de la ÚLTIMA migración (orden por nombre = orden de aplicación) que define la función. */
function latestDefinition(functionName: string): { file: string; sql: string } {
  const marker = `create or replace function public.${functionName}(`
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  const defining = files.filter((f) =>
    readFileSync(join(MIGRATIONS_DIR, f), 'utf-8').includes(marker),
  )
  const file = defining[defining.length - 1]
  expect(file, `ninguna migración define ${functionName}`).toBeDefined()
  return { file, sql: readFileSync(join(MIGRATIONS_DIR, file), 'utf-8') }
}

/** Tipos exonerados de rótulo según `v_content_type not in (...)`, dentro de la definición de esa función. */
function sqlExemptTypes(functionName: string): string[] {
  const { sql } = latestDefinition(functionName)
  const start = sql.indexOf(
    `create or replace function public.${functionName}(`,
  )
  // La definición acaba en el siguiente `create or replace` o en el final.
  const next = sql.indexOf('create or replace function', start + 1)
  const body = sql.slice(start, next === -1 ? undefined : next)
  const match = body.match(
    /v_content_type not in \(([^)]*)\)\s+and v_label is null/,
  )
  expect(
    match,
    `${functionName}: no se encuentra la comprobación del rótulo`,
  ).not.toBeNull()
  return match![1].split(',').map((t) => t.trim().replace(/^'|'$/g, ''))
}

describe('rótulo automático del pin: TypeScript y SQL coinciden', () => {
  it.each(['create_pin', 'update_pin'])(
    '%s exonera de rótulo exactamente los tipos de DERIVED_PIN_LABEL_TYPES',
    (fn) => {
      expect([...sqlExemptTypes(fn)].sort()).toEqual(
        [...DERIVED_PIN_LABEL_TYPES].sort(),
      )
    },
  )

  it('el insight está entre ellos (el bug original)', () => {
    expect(hasDerivedPinLabel('insight')).toBe(true)
    expect(sqlExemptTypes('create_pin')).toContain('insight')
    expect(sqlExemptTypes('update_pin')).toContain('insight')
  })

  it('tool y other siguen exigiendo frase gancho escrita', () => {
    expect(hasDerivedPinLabel('tool')).toBe(false)
    expect(hasDerivedPinLabel('other')).toBe(false)
  })
})

describe('pinCreationErrorMessage', () => {
  const dbError = (message: string, code?: string) =>
    Object.assign(new Error(message), { code })

  it('muestra tal cual un rechazo de validación de la base de datos (22023)', () => {
    expect(
      pinCreationErrorMessage(
        dbError('El alt del pin es obligatorio', '22023'),
      ),
    ).toBe('El alt del pin es obligatorio')
  })

  it('no filtra el texto de otros errores de Postgres (permisos, conexión, etc.)', () => {
    expect(
      pinCreationErrorMessage(
        dbError('permission denied for table pin', '42501'),
      ),
    ).toBe('No se ha podido crear el pin.')
    expect(pinCreationErrorMessage(dbError('fetch failed'))).toBe(
      'No se ha podido crear el pin.',
    )
  })

  it('un 22023 sin mensaje o algo que no es un Error cae al genérico', () => {
    expect(pinCreationErrorMessage(dbError('  ', '22023'))).toBe(
      'No se ha podido crear el pin.',
    )
    expect(pinCreationErrorMessage('boom')).toBe(
      'No se ha podido crear el pin.',
    )
    expect(pinCreationErrorMessage(null)).toBe('No se ha podido crear el pin.')
  })
})

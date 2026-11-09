import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migración del carrusel de casos: reordenar, editar el alt y sustituir el
 * medio (9 nov 2026). Es SQL: aquí se vigila lo que no se puede volver a mirar
 * en Supabase sin aplicarlo. El comportamiento se validó contra un Postgres
 * real (PGlite) al escribirla; estos tests fijan las reglas que lo hacen
 * seguro para que un cambio futuro no las pierda sin que salte algo.
 */

const dir = join(process.cwd(), 'supabase', 'migrations')
const FILE = '20261109140000_case_carousel_reorder_and_edit.sql'
const sql = readFileSync(join(dir, FILE), 'utf8').replace(/\r\n/g, '\n')

function functionBody(name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`)

  expect(start, `no existe ${name}`).toBeGreaterThan(-1)

  const end = sql.indexOf('$$;', start)

  return sql.slice(start, end)
}

describe('migración del carrusel: orden y edición', () => {
  it('es la última migración (se aplica después de todas las anteriores)', () => {
    const names = readdirSync(dir)
      .filter((name) => name.endsWith('.sql'))
      .sort()

    expect(names.at(-1)).toBe(FILE)
  })

  it.each([
    'reorder_case_carousel',
    'update_case_carousel_alt',
    'replace_case_carousel_media',
  ])('%s: security invoker, search_path fijo y solo admins', (name) => {
    const body = functionBody(name)

    expect(body).toMatch(/security invoker/)
    expect(body).toMatch(/set search_path = public/)
    expect(body).toMatch(/is_admin\(\)/)
    expect(body).toMatch(/42501/)
  })

  it.each([
    'reorder_case_carousel(uuid, uuid[])',
    'update_case_carousel_alt(uuid, uuid, text)',
  ])('%s: sin acceso público, ejecutable por authenticated', (signature) => {
    expect(sql).toContain(`revoke all on function public.${signature}`)
    expect(sql).toMatch(
      new RegExp(
        `grant execute on function public\\.${signature.replace(/[()[\]]/g, '\\$&')}\\s+to authenticated`,
      ),
    )
  })

  it('replace_case_carousel_media: sin acceso público, ejecutable por authenticated', () => {
    expect(sql).toMatch(
      /revoke all on function public\.replace_case_carousel_media\([^)]*\)\s+from public/,
    )
    expect(sql).toMatch(
      /grant execute on function public\.replace_case_carousel_media\([^)]*\)\s+to authenticated/,
    )
  })

  it('reordenar bloquea las filas, exige el mismo conjunto y renumera sin huecos', () => {
    const body = functionBody('reorder_case_carousel')

    expect(body).toMatch(/for update/)
    expect(body).toMatch(/ZG014/)
    expect(body).toMatch(/22023/)
    expect(body).toMatch(/sort_order = ordered\.pos - 1/)
  })

  it('sustituir conserva la fila, valida límites y borra el medio anterior en la misma transacción', () => {
    const body = functionBody('replace_case_carousel_media')

    expect(body).toMatch(/for update/)
    expect(body).toMatch(/ZG002/)
    expect(body).toMatch(/ZG003/)
    expect(body).toMatch(/ZG004/)
    expect(body).toMatch(/update public\.case_detail_media/)
    expect(body).toMatch(/delete from public\.media_asset/)
    // El alta del medio nuevo va antes de repuntar y el borrado del viejo después.
    expect(body.indexOf('insert into public.media_asset')).toBeLessThan(
      body.indexOf('update public.case_detail_media'),
    )
    expect(body.indexOf('update public.case_detail_media')).toBeLessThan(
      body.indexOf('delete from public.media_asset'),
    )
  })

  it.each([
    ['reorder_case_carousel', 'reorder_case_carousel'],
    ['replace_case_carousel_media', 'replace_case_carousel_media'],
  ])('%s deja rastro en audit_log', (name, action) => {
    const body = functionBody(name)

    expect(body).toMatch(/insert into public\.audit_log/)
    expect(body).toContain(`'${action}'`)
  })
})

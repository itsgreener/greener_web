import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migración de los pines de episodio como carrusel (11 nov 2026, §2.150).
 * Es SQL: aquí se fijan las reglas que lo hacen seguro, para que un cambio
 * futuro no las pierda sin que salte algo.
 */

const dir = join(process.cwd(), 'supabase', 'migrations')
const FILE = '20261111110000_content_pins_as_carousel.sql'
const sql = readFileSync(join(dir, FILE), 'utf8').replace(/\r\n/g, '\n')

function functionBody(name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`)

  expect(start, `no existe ${name}`).toBeGreaterThan(-1)

  return sql.slice(start, sql.indexOf('$$;', start))
}

describe('migración: pines de episodio como carrusel', () => {
  it('es la última migración', () => {
    const names = readdirSync(dir)
      .filter((name) => name.endsWith('.sql'))
      .sort()

    expect(names.at(-1)).toBe(FILE)
  })

  it('añade la columna con false por defecto y not null', () => {
    expect(sql).toMatch(
      /add column pins_as_carousel boolean not null default false/,
    )
  })

  it('set_content_pins_carousel: invoker, solo admins, solo episodios, con auditoría', () => {
    const body = functionBody('set_content_pins_carousel')

    expect(body).toMatch(/security invoker/)
    expect(body).toMatch(/set search_path = public/)
    expect(body).toMatch(/not public\.is_admin\(\)[\s\S]*errcode = '42501'/)
    expect(body).toMatch(/<> 'episode'[\s\S]*errcode = 'ZG007'/)
    expect(body).toMatch(/errcode = 'P0002'/)
    expect(body).toMatch(/insert into public\.audit_log/)
    expect(sql).toMatch(
      /grant execute on function public\.set_content_pins_carousel\(uuid, boolean\) to authenticated/,
    )
  })

  it('al activar rechaza ratios mezclados con ZG019, y sin pines sí deja activar', () => {
    const body = functionBody('set_content_pins_carousel')

    expect(body).toMatch(/count\(distinct ratio\)/)
    expect(body).toMatch(/v_ratios > 1[\s\S]*errcode = 'ZG019'/)
  })

  it('el trigger impide un pin con otro ratio mientras la marca está activa', () => {
    const body = functionBody('enforce_carousel_pin_ratio')

    expect(body).toMatch(/c\.pins_as_carousel/)
    expect(body).toMatch(/p\.id <> new\.id/)
    expect(body).toMatch(/p\.ratio <> new\.ratio/)
    expect(body).toMatch(/errcode = 'ZG019'/)
    expect(sql).toMatch(
      /create trigger pin_carousel_same_ratio\s+before insert or update of ratio on public\.pin/,
    )
  })

  it('la cabecera documenta ZG019', () => {
    expect(sql).toMatch(/ZG019 {2}los pines del episodio no comparten ratio/)
  })
})

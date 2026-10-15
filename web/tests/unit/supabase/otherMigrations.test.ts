import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Fase 1 del plan de other (docs/especificaciones/plan-other-pines-y-paginas.md,
 * §3): las cuatro migraciones del 15 oct 2026. No hay base de datos en los
 * tests; se fija lo que cada fichero tiene que decir para que el esquema y
 * las reglas de publicación no se rompan sin que nadie lo note.
 */

const dir = resolve(__dirname, '../../../supabase/migrations')

const read = (name: string) =>
  readFileSync(resolve(dir, name), 'utf8').replace(/\r\n/g, '\n')

const detail = read('20261015100000_other_detail.sql')
const variety = read('20261015110000_html_package_kind_variety.sql')
const rules = read('20261015120000_other_package_and_publish_rules.sql')
const noCover = read('20261015130000_remove_other_cover.sql')

/** Cuerpo de una función `create or replace function public.<name>(`. */
function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`)
  expect(start, `falta la función ${name}`).toBeGreaterThanOrEqual(0)
  const next = sql.indexOf('create or replace function', start + 10)
  return sql.slice(start, next === -1 ? undefined : next)
}

describe('orden de las migraciones', () => {
  it('son las cuatro del plan, en orden y posteriores a los códigos de error', () => {
    const files = readdirSync(dir).filter((name) => name >= '20261015')

    expect(files).toEqual([
      '20261015100000_other_detail.sql',
      '20261015110000_html_package_kind_variety.sql',
      '20261015120000_other_package_and_publish_rules.sql',
      '20261015130000_remove_other_cover.sql',
    ])
    expect(files[0] > '20261009120000_typed_error_codes.sql').toBe(true)
  })
})

describe('1. other_detail', () => {
  it('crea el enum con los dos subtipos', () => {
    expect(detail).toMatch(
      /create type other_kind as enum \('newsletter', 'page'\)/,
    )
  })

  it('la frecuencia es obligatoria, vale 100 por defecto y nunca baja de 25', () => {
    expect(detail).toMatch(
      /frequency integer not null default 100 check \(frequency >= 25\)/,
    )
  })

  it('la clave es el contenido y se borra con él', () => {
    expect(detail).toMatch(
      /content_id uuid primary key references public\.content \(id\) on delete cascade/,
    )
  })

  it('aborta si ya existe algún contenido other', () => {
    expect(detail).toMatch(/where type = 'other'/)
    expect(detail).toMatch(/if v_count > 0 then\s+raise exception/)
  })

  it('el trigger solo admite contenido other y no deja cambiar el subtipo', () => {
    const guard = functionBody(detail, 'other_detail_guard')

    expect(guard).toMatch(/v_type is distinct from 'other'/)
    expect(guard).toMatch(/new\.kind <> old\.kind/)
    expect(detail).toMatch(
      /create trigger other_detail_guard\s+before insert or update on public\.other_detail/,
    )
  })

  it('RLS: lectura pública solo de lo publicado y todo para el admin', () => {
    expect(detail).toMatch(
      /alter table public\.other_detail enable row level security/,
    )
    expect(detail).toMatch(
      /other_detail_public_read[\s\S]*c\.status = 'published'/,
    )
    expect(detail).toMatch(
      /other_detail_admin_all[\s\S]*using \(public\.is_admin\(\)\) with check \(public\.is_admin\(\)\)/,
    )
  })
})

describe('2. html_package_kind «variety»', () => {
  it('es solo el alter type, en un fichero propio', () => {
    const statements = variety
      .split('\n')
      .filter((line) => !line.trim().startsWith('--') && line.trim() !== '')

    expect(statements.join(' ').trim()).toBe(
      "alter type html_package_kind add value if not exists 'variety';",
    )
  })
})

describe('3. paquetes y reglas de publicación', () => {
  it('create_html_package_version acepta other de tipo page como variety', () => {
    const body = functionBody(rules, 'create_html_package_version')

    expect(body).toMatch(/v_content_type = 'other' and exists/)
    expect(body).toMatch(/kind = 'page'/)
    expect(body).toMatch(/v_kind := 'variety'/)
    // tool e insight siguen igual
    expect(body).toMatch(/v_kind := 'tool'/)
    expect(body).toMatch(/v_kind := 'insight'/)
  })

  it.each(['publish_content', 'schedule_content'])(
    '%s exige subtipo, y a la página paquete publicado y un pin con medio',
    (name) => {
      const body = functionBody(rules, name)

      expect(body).toMatch(/v_content_type = 'other'/)
      // sin subtipo
      expect(body).toMatch(/if not found then[\s\S]*errcode = 'ZG017'/)
      // solo la página exige lo demás: la newsletter no necesita nada más
      expect(body).toMatch(/if v_other_kind = 'page' then/)
      expect(body).toMatch(/current_version_id is not null[\s\S]*errcode = 'ZG009'/)
      expect(body).toMatch(/join public\.pin_media pm[\s\S]*errcode = 'ZG018'/)
    },
  )

  it('conserva la regla de paquete de tool e insight', () => {
    for (const name of ['publish_content', 'schedule_content']) {
      expect(functionBody(rules, name)).toMatch(
        /v_content_type in \('tool', 'insight'\)/,
      )
    }
  })

  it('los dos códigos nuevos están documentados en la cabecera', () => {
    expect(rules).toMatch(/ZG017 {2}el contenido Other no tiene subtipo/)
    expect(rules).toMatch(/ZG018 {2}la página satélite no tiene ningún pin/)
  })
})

describe('4. retirada de la portada', () => {
  it('limpia datos y borra los medios huérfanos antes de quitar las columnas', () => {
    const cleanup = noCover.indexOf('set cover_media_id = null')
    const dropColumn = noCover.indexOf('drop column cover_media_id')

    expect(cleanup).toBeGreaterThan(0)
    expect(dropColumn).toBeGreaterThan(cleanup)
    expect(noCover).toMatch(/delete from public\.media_asset ma/)
  })

  it('elimina el CHECK, las dos columnas y las tres RPC', () => {
    expect(noCover).toMatch(/drop constraint content_cover_only_for_other/)
    expect(noCover).toMatch(/drop column cover_media_id,\s+drop column cover_ratio/)
    expect(noCover).toMatch(/drop function public\.register_cover_image\(/)
    expect(noCover).toMatch(/drop function public\.register_cover_video\(/)
    expect(noCover).toMatch(/drop function public\.unlink_and_delete_cover_media\(/)
  })

  it('delete_pin y delete_content se redefinen sin mirar la portada', () => {
    const afterDrop = noCover.slice(
      noCover.indexOf('create or replace function public.delete_pin('),
    )

    expect(afterDrop).toMatch(/create or replace function public\.delete_pin\(/)
    expect(afterDrop).toMatch(/create or replace function public\.delete_content\(/)
    expect(afterDrop).not.toMatch(/cover_media_id|cover_ratio/)
    // y siguen protegiendo la imagen de compartición
    expect(afterDrop).toMatch(/c\.og_media_id = ma\.id/)
  })
})

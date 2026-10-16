import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migraciones del plan de pendientes del 16 oct 2026 (bloques B3 y C10).
 * Son SQL: aquí se vigila lo que no se puede volver a mirar en Supabase sin
 * aplicarlas (que el job exista y no lo llame un cliente, y que lo retirado
 * no siga en los tipos).
 */

const dir = join(process.cwd(), 'supabase', 'migrations')
const read = (name: string) =>
  readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n')

const purge = read('20261016100000_purge_feed_sessions_cron.sql')
const dropColumns = read('20261016110000_feed_config_drop_dead_columns.sql')

describe('B3 — purga diaria de feed_session', () => {
  it('programa un job de pg_cron una vez al día, con nombre fijo (idempotente)', () => {
    expect(purge).toMatch(/create extension if not exists pg_cron/)
    expect(purge).toMatch(
      /cron\.schedule\(\s*'purge-expired-feed-sessions',\s*'15 3 \* \* \*'/,
    )
    expect(purge).toMatch(/select public\.purge_expired_feed_sessions\(\)/)
  })

  it('borra solo las sesiones caducadas hace más de 24 h, y feed_round cae en cascada', () => {
    expect(purge).toMatch(/expires_at < now\(\) - interval '24 hours'/)
    expect(purge).toMatch(/delete from public\.feed_session/)
    // No se toca feed_round a mano: lo borra el `on delete cascade`.
    expect(purge).not.toMatch(/delete from public\.feed_round/)
  })

  it('borra por lotes y devuelve cuántas borró', () => {
    expect(purge).toMatch(/limit 5000/)
    expect(purge).toMatch(/exit when v_batch = 0/)
    expect(purge).toMatch(/returns integer/)
  })

  it('la función es security definer, con search_path fijo y sin acceso para clientes', () => {
    expect(purge).toMatch(/security definer/)
    expect(purge).toMatch(/set search_path = public, pg_temp/)
    expect(purge).toMatch(
      /revoke all on function public\.purge_expired_feed_sessions\(\) from public, anon, authenticated/,
    )
  })

  it('crea el índice por expires_at que necesita el borrado', () => {
    expect(purge).toMatch(
      /create index if not exists feed_session_expires_at_idx\s+on public\.feed_session \(expires_at\)/,
    )
  })

  it('el cascade de feed_round sigue en la migración original', () => {
    const taxonomy = read('20260806090500_feed_taxonomy.sql')

    expect(taxonomy).toMatch(
      /session_id uuid not null references feed_session \(id\) on delete cascade/,
    )
  })
})

describe('C10 — columnas muertas de feed_config', () => {
  it('retira las cuatro, con `if exists`', () => {
    for (const column of [
      'mix_window',
      'distance_window',
      'video_limit_desktop',
      'video_limit_mobile',
    ]) {
      expect(dropColumns).toMatch(
        new RegExp(`drop column if exists ${column}\\b`),
      )
    }
  })

  it('no toca las dos que lee el motor', () => {
    const code = dropColumns
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')

    expect(code).not.toMatch(/\bratios\b/)
    expect(code).not.toMatch(/\bbatch_size\b/)
  })

  it('los tipos generados ya no las llevan, y conservan las que se usan', () => {
    const types = readFileSync(
      join(process.cwd(), 'src', 'lib', 'supabase', 'database.types.ts'),
      'utf8',
    )
    const block = types.slice(
      types.indexOf('feed_config: {'),
      types.indexOf('feed_round: {'),
    )

    expect(block).not.toMatch(
      /mix_window|distance_window|video_limit_desktop|video_limit_mobile/,
    )
    expect(block).toMatch(/batch_size/)
    expect(block).toMatch(/ratios/)
  })
})

describe('orden', () => {
  it('van después de la migración del ABM de other', () => {
    expect(
      '20261016100000_purge_feed_sessions_cron.sql' >
        '20261016090000_other_abm.sql',
    ).toBe(true)
    expect(
      '20261016110000_feed_config_drop_dead_columns.sql' >
        '20261016100000_purge_feed_sessions_cron.sql',
    ).toBe(true)
  })
})

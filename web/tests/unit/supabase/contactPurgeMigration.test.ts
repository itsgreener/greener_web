import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Purga de `contact_submission` (19 oct 2026). Es SQL: aquí se vigila lo que
 * no se puede volver a mirar en Supabase sin aplicarlo. El plazo (30 días) es
 * una promesa del texto legal de /privacy: si cambia aquí, cambia allí.
 */

const dir = join(process.cwd(), 'supabase', 'migrations')
const read = (name: string) =>
  readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n')

const purge = read('20261019140000_purge_contact_submissions_cron.sql')

describe('purga diaria de contact_submission', () => {
  it('programa un job de pg_cron una vez al día, con nombre fijo (idempotente)', () => {
    expect(purge).toMatch(/create extension if not exists pg_cron/)
    expect(purge).toMatch(
      /cron\.schedule\(\s*'purge-expired-contact-submissions',\s*'30 3 \* \* \*'/,
    )
    expect(purge).toMatch(
      /select public\.purge_expired_contact_submissions\(\)/,
    )
  })

  it('borra solo los registros con más de 30 días', () => {
    expect(purge).toMatch(/created_at < now\(\) - interval '30 days'/)
    expect(purge).toMatch(/delete from public\.contact_submission/)
  })

  it('borra por lotes y devuelve cuántos borró', () => {
    expect(purge).toMatch(/limit 5000/)
    expect(purge).toMatch(/exit when v_batch = 0/)
    expect(purge).toMatch(/returns integer/)
  })

  it('la función es security definer, con search_path fijo y sin acceso para clientes', () => {
    expect(purge).toMatch(/security definer/)
    expect(purge).toMatch(/set search_path = public, pg_temp/)
    expect(purge).toMatch(
      /revoke all on function public\.purge_expired_contact_submissions\(\) from public, anon, authenticated/,
    )
  })

  it('crea el índice por created_at que necesita el borrado', () => {
    expect(purge).toMatch(
      /create index if not exists contact_submission_created_at_idx\s+on public\.contact_submission \(created_at\)/,
    )
  })

  it('actúa sobre la tabla que crea la migración original', () => {
    const original = read('20260916090000_contact_submission.sql')

    expect(original).toMatch(/create table[^;]*contact_submission/i)
    expect(original).toMatch(/created_at/)
  })

  it('el plazo coincide con el que declara el texto de /privacy', () => {
    const policy = readFileSync(
      join(
        process.cwd(),
        'src',
        'app',
        '(public)',
        'privacy',
        'policyContent.ts',
      ),
      'utf8',
    )

    expect(policy).toMatch(/deleted automatically after 30 days/)
  })
})

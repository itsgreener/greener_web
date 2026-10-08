import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261008090000_media_asset_warm_tracking.sql',
  ),
  'utf-8',
)

describe('migración media_asset_warm_tracking (fase 2 de medios)', () => {
  it('añade las tres columnas, todas anulables', () => {
    expect(sql).toMatch(/add column warmed_contract text,/)
    expect(sql).toMatch(/add column warmed_at timestamptz,/)
    expect(sql).toMatch(/add column warm_error text;/)
    expect(sql).not.toMatch(/warm\w+ [a-z]+ not null/i)
  })

  it('la función exige admin o rol de servicio (is_admin() no sirve con la secret key)', () => {
    expect(sql).toMatch(
      /v_is_service boolean := \(current_user = 'service_role'\)/,
    )
    expect(sql).toMatch(/not \(v_is_service or public\.is_admin\(\)\)/)
    expect(sql).toMatch(/security invoker/)
  })

  it('solo admite vídeos y existentes', () => {
    expect(sql).toMatch(/v_kind <> 'video'/)
    expect(sql).toMatch(/El medio no existe/)
  })

  it('éxito: guarda contrato y fecha y borra el error; fallo: deja el vídeo sin calentar', () => {
    expect(sql).toMatch(
      /set warmed_contract = v_contract,\s+warmed_at = now\(\),\s+warm_error = null/,
    )
    expect(sql).toMatch(
      /set warmed_contract = null,\s+warmed_at = null,\s+warm_error = v_error/,
    )
  })

  it('el error se recorta a 300 caracteres (media_asset tiene lectura pública)', () => {
    expect(sql).toMatch(/left\(btrim\(coalesce\(p_error, ''\)\), 300\)/)
  })

  it('deja rastro en audit_log, también del rol de servicio', () => {
    expect(sql).toMatch(/'mark_media_warmed'/)
    expect(sql).toMatch(/when v_is_service then 'service_role'/)
  })

  it('permisos: fuera público; autenticados y servicio dentro', () => {
    expect(sql).toMatch(
      /revoke all on function public\.mark_media_asset_warmed\(uuid, text, text\) from public/,
    )
    expect(sql).toMatch(
      /grant execute on function public\.mark_media_asset_warmed\(uuid, text, text\) to authenticated, service_role/,
    )
  })
})

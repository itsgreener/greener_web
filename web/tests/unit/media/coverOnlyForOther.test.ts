import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// 7 oct 2026: tool e insight ya no tienen portada (tool usa ?pin=, insight
// va directo a /app). Solo "other" la conserva. Estas pruebas fijan que la
// migración cierra el acceso y que el ABM no la ofrece a tool/insight.

const root = join(__dirname, '..', '..', '..')
const migration = readFileSync(
  join(
    root,
    'supabase/migrations/20261007110000_remove_tool_insight_cover.sql',
  ),
  'utf8',
)
const adminPage = readFileSync(
  join(root, 'src/app/admin/contents/[id]/edit/page.tsx'),
  'utf8',
)

describe('portada solo para contenido libre (other)', () => {
  it('la migración limpia los datos de tool/insight', () => {
    expect(migration).toMatch(/type in \('tool', 'insight'\)/)
    expect(migration).toMatch(/set cover_media_id = null, cover_ratio = null/)
  })

  it('register_cover_image solo acepta other', () => {
    expect(migration).toMatch(/v_content_type <> 'other'/)
    expect(migration).not.toMatch(/not in \('tool', 'insight', 'other'\)/)
  })

  it('un CHECK impide portada en cualquier tipo que no sea other', () => {
    expect(migration).toMatch(
      /check \(type = 'other' or \(cover_media_id is null and cover_ratio is null\)\)/,
    )
  })

  it('el ABM solo muestra la portada para other', () => {
    expect(adminPage).toMatch(
      /const supportsCoverMedia = content\.type === 'other'/,
    )
  })
})

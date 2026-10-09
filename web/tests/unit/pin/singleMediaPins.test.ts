import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MAX_PINS_PER_CONTENT,
  remainingPinSlots,
} from '@/modules/pin/domain/pinLimits'

// 7 oct 2026 (§2.41): un pin es UN medio y cada contenido admite como
// máximo 8 pines. No hay carrusel de pines. Estas pruebas fijan la
// migración y el ABM para que no se reintroduzca por accidente.

const root = join(__dirname, '..', '..', '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const migration = read(
  'supabase/migrations/20261007120000_pins_single_media_no_carousel.sql',
)

describe('límites de pines', () => {
  it('el máximo es 8 y los huecos nunca son negativos', () => {
    expect(MAX_PINS_PER_CONTENT).toBe(8)
    expect(remainingPinSlots(0)).toBe(8)
    expect(remainingPinSlots(5)).toBe(3)
    expect(remainingPinSlots(8)).toBe(0)
    expect(remainingPinSlots(12)).toBe(0)
  })

  it('el trigger de la base de datos usa el mismo máximo que el ABM', () => {
    expect(migration).toMatch(
      new RegExp(
        `>= ${MAX_PINS_PER_CONTENT}\\s+then[\\s\\S]*máximo ${MAX_PINS_PER_CONTENT} pines`,
      ),
    )
  })
})

describe('migración 20261007120000', () => {
  it('avisa (no trunca) si hay pines con varios medios o contenidos con más de 8 pines', () => {
    expect(migration).toMatch(/having count\(\*\) > 1/)
    expect(migration).toMatch(/having count\(\*\) > 8/)
    expect(migration).toMatch(/raise exception 'Hay pines con más de un medio/)
    expect(migration).toMatch(
      /raise exception 'Hay contenidos con más de 8 pines/,
    )
    // La comprobación va antes de cualquier cambio de esquema.
    expect(migration.indexOf('having count(*) > 8')).toBeLessThan(
      migration.indexOf('drop column show_as_carousel'),
    )
  })

  it('elimina show_as_carousel y speed_ms pero conserva autoplay_mode', () => {
    expect(migration).toMatch(/drop column show_as_carousel/)
    expect(migration).toMatch(/drop column speed_ms/)
    expect(migration).not.toMatch(/drop column autoplay_mode/)
  })

  it('un medio por pin: índice único y trigger con mensaje legible', () => {
    expect(migration).toMatch(
      /create unique index pin_media_one_per_pin_idx on public\.pin_media \(pin_id\)/,
    )
    expect(migration).toMatch(/Un pin admite un solo medio/)
  })

  it('create_pin y update_pin ya no reciben el flag ni la velocidad', () => {
    const fns = migration.slice(
      migration.indexOf('create or replace function public.create_pin('),
    )
    expect(fns).not.toMatch(/p_show_as_carousel|p_speed_ms/)
    expect(fns).toMatch(/'case', 'episode', 'insight'/)
  })
})

describe('ABM y feed sin carrusel de pines', () => {
  const files = [
    'src/app/admin/contents/[id]/edit/PinList.tsx',
    'src/app/admin/contents/[id]/edit/BulkPinUpload.tsx',
    'src/app/admin/contents/[id]/edit/pinActions.ts',
    'src/components/pin/PinCard/index.tsx',
    'src/modules/feed/infrastructure/supabaseFeedSource.ts',
    'src/modules/pin/infrastructure/supabasePinRepository.ts',
  ]

  it.each(files)(
    '%s no menciona showAsCarousel ni show_as_carousel',
    (file) => {
      expect(read(file)).not.toMatch(
        /showAsCarousel|show_as_carousel|speedMs|speed_ms/,
      )
    },
  )

  it('el feed ya no genera unitIds con «::»', () => {
    expect(
      read('src/modules/feed/infrastructure/supabaseFeedSource.ts'),
    ).not.toMatch(/::\$\{|split\('::'\)/)
  })

  it('la ficha de tool ya no lee ?slide=', () => {
    expect(read('src/app/(public)/tools/[slug]/page.tsx')).not.toMatch(
      /slide\b(?!_order)/,
    )
  })
})

describe('migración 20261007130000 — orden en cola automático', () => {
  const m = read('supabase/migrations/20261007130000_pin_queue_order_auto.sql')

  it('create_pin asigna el siguiente libre del contenido, con bloqueo', () => {
    expect(m).toMatch(/coalesce\(max\(queue_order\) \+ 1, 0\)/)
    expect(m).toMatch(/pg_advisory_xact_lock/)
  })

  it('create_pin y update_pin ya no reciben p_queue_order', () => {
    const fns = m.slice(
      m.indexOf('create or replace function public.create_pin('),
    )
    expect(fns).not.toMatch(/p_queue_order/)
  })

  it('renumera los pines existentes respetando su orden actual', () => {
    expect(m).toMatch(/order by queue_order, created_at, id/)
  })

  it.each([
    'src/app/admin/contents/[id]/edit/PinList.tsx',
    'src/app/admin/contents/[id]/edit/BulkPinUpload.tsx',
    'src/app/admin/contents/[id]/edit/pinActions.ts',
    'src/modules/pin/infrastructure/supabasePinRepository.ts',
  ])('%s no pide ni envía queueOrder', (file) => {
    expect(read(file)).not.toMatch(/queueOrder|p_queue_order/)
  })
})

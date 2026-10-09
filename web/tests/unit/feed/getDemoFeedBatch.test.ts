import { describe, it, expect } from 'vitest'
import { getDemoFeedBatch } from '@/modules/feed/application/getDemoFeedBatch'

describe('getDemoFeedBatch — dataset real de demostración', () => {
  it('sirve un primer lote enriquecido, con destino, ratio y alt para cada pin', async () => {
    const batch = await getDemoFeedBatch('preview-seed', 0, 40)

    expect(batch.items.length).toBe(40)
    expect(batch.hasMore).toBe(true)
    expect(batch.nextOffset).toBe(40)

    for (const item of batch.items) {
      expect(item.destination).toMatch(/^\/(work|channel)\//)
      expect(item.ratio).toMatch(/^(1:1|4:5|3:4|2:3|9:16|16:9)$/)
      expect(item.alt.length).toBeGreaterThan(0)
      expect(item.cloudinaryPublicId.length).toBeGreaterThan(0)
    }
  })

  it('dos lotes consecutivos concatenan sin huecos ni duplicados frente a pedirlo de una vez', async () => {
    const whole = await getDemoFeedBatch('preview-seed', 0, 80)
    const first = await getDemoFeedBatch('preview-seed', 0, 40)
    const second = await getDemoFeedBatch('preview-seed', 40, 40)

    expect([...first.items, ...second.items]).toEqual(whole.items)
  })

  it('scroll continuo real: pedir 400 pines (varias tandas) no lanza y devuelve exactamente 400', async () => {
    const batch = await getDemoFeedBatch('preview-seed', 0, 400)
    expect(batch.items.length).toBe(400)
    expect(batch.hasMore).toBe(true)
  })

  it('es determinista entre llamadas', async () => {
    const a = await getDemoFeedBatch('preview-seed', 120, 40)
    const b = await getDemoFeedBatch('preview-seed', 120, 40)
    expect(a.items).toEqual(b.items)
  })
})

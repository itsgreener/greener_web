import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeRecordAuditEvent } from '@/modules/audit/application/recordAuditEvent'
import type { AuditEvent } from '@/modules/audit/domain/auditRecorder'

const event: AuditEvent = {
  actorEmail: 'ana@itsgreener.com',
  action: 'talent.cv_open',
  entity: 'talent_candidate',
  entityId: '0b1f1a52-3b8e-4a0e-9c1d-5d4e6f7a8b9c',
  payload: { kind: 'drive' },
}

describe('recordAuditEvent', () => {
  it('escribe el hecho y devuelve true', async () => {
    const record = vi.fn(async () => {})

    expect(await makeRecordAuditEvent({ recorder: { record } })(event)).toBe(
      true,
    )
    expect(record).toHaveBeenCalledWith(event)
  })

  it('no lanza: si falla, devuelve false y lo deja en el log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const record = vi.fn(async () => {
      throw new Error('RLS')
    })

    expect(await makeRecordAuditEvent({ recorder: { record } })(event)).toBe(
      false,
    )
    expect(log).toHaveBeenCalled()
  })
})

describe('supabaseAuditRecorder', () => {
  const insert = vi.fn()

  beforeEach(() => {
    insert.mockReset().mockResolvedValue({ error: null })
    vi.resetModules()
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({ from: () => ({ insert }) }),
    }))
  })

  it('inserta la fila en audit_log con las columnas de la tabla', async () => {
    const { supabaseAuditRecorder } =
      await import('@/modules/audit/infrastructure/supabaseAuditRecorder')

    await supabaseAuditRecorder.record(event)

    expect(insert).toHaveBeenCalledWith({
      actor_email: 'ana@itsgreener.com',
      action: 'talent.cv_open',
      entity: 'talent_candidate',
      entity_id: event.entityId,
      payload: { kind: 'drive' },
    })
  })

  it('sin payload escribe null', async () => {
    const { supabaseAuditRecorder } =
      await import('@/modules/audit/infrastructure/supabaseAuditRecorder')

    await supabaseAuditRecorder.record({ ...event, payload: undefined })

    expect(insert.mock.calls[0][0].payload).toBeNull()
  })

  it('si la base lo rechaza (no es admin), lanza', async () => {
    insert.mockResolvedValue({
      error: { message: 'row-level security', code: '42501' },
    })

    const { supabaseAuditRecorder } =
      await import('@/modules/audit/infrastructure/supabaseAuditRecorder')

    await expect(supabaseAuditRecorder.record(event)).rejects.toThrow()
  })
})

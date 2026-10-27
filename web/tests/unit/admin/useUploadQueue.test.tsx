// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useUploadQueue, type QueueRow } from '@/app/admin/_lib/useUploadQueue'

type Row = QueueRow & { id: number; note?: string }

const key = (row: Row) => row.id

function row(id: number, status: Row['status'] = 'pending'): Row {
  return { id, status }
}

function setup(initial: Row[]) {
  const hook = renderHook(() => useUploadQueue<Row>(key))
  act(() => hook.result.current.setRows(initial))

  return hook
}

describe('useUploadQueue', () => {
  it('sube las filas una a una, en orden, y marca cada una', async () => {
    const hook = setup([row(1), row(2), row(3)])
    const order: number[] = []
    let inFlight = 0
    let maxInFlight = 0

    let summary: Awaited<ReturnType<typeof hook.result.current.run>> | undefined

    await act(async () => {
      summary = await hook.result.current.run(async (item) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        order.push(item.id)
        await Promise.resolve()
        inFlight -= 1
      })
    })

    expect(order).toEqual([1, 2, 3])
    expect(maxInFlight).toBe(1)
    expect(summary).toEqual({ ok: 3, failed: 0 })
    expect(hook.result.current.rows.map((r) => r.status)).toEqual([
      'ok',
      'ok',
      'ok',
    ])
    expect(hook.result.current.running).toBe(false)
  })

  it('salta las filas ya subidas', async () => {
    const hook = setup([row(1, 'ok'), row(2)])
    const worker = vi.fn<(row: Row) => Promise<void>>(async () => {})

    await act(async () => {
      await hook.result.current.run(worker)
    })

    expect(worker).toHaveBeenCalledTimes(1)
    expect(worker.mock.calls[0]?.[0]).toMatchObject({ id: 2 })
  })

  it('un fallo no detiene el lote: la fila queda en error con su mensaje', async () => {
    const hook = setup([row(1), row(2), row(3)])
    let summary: { ok: number; failed: number } | undefined

    await act(async () => {
      summary = await hook.result.current.run(async (item) => {
        if (item.id === 2) throw new Error('demasiado grande')
      })
    })

    expect(summary).toEqual({ ok: 2, failed: 1 })
    expect(hook.result.current.rows[1]).toMatchObject({
      status: 'error',
      error: 'demasiado grande',
    })
    expect(hook.result.current.rows[2]?.status).toBe('ok')
  })

  it('un error que no es Error usa el mensaje genérico', async () => {
    const hook = setup([row(1)])

    await act(async () => {
      await hook.result.current.run(async () => {
        throw 'boom'
      })
    })

    expect(hook.result.current.rows[0]).toMatchObject({
      status: 'error',
      error: 'Error al subir.',
    })
  })

  it('fusiona los campos que devuelve el worker y limpia el error anterior', async () => {
    const hook = setup([{ id: 1, status: 'error', error: 'antiguo' }])

    await act(async () => {
      await hook.result.current.run(async () => ({ note: 'aviso' }))
    })

    expect(hook.result.current.rows[0]).toMatchObject({
      status: 'ok',
      note: 'aviso',
      error: undefined,
    })
  })

  it('reintentar repite solo las filas que fallaron', async () => {
    const hook = setup([row(1), row(2)])
    let attempt = 0

    const worker = vi.fn(async (item: Row) => {
      if (item.id === 2 && attempt === 0) throw new Error('corte')
    })

    await act(async () => {
      await hook.result.current.run(worker)
    })
    attempt = 1
    worker.mockClear()

    await act(async () => {
      await hook.result.current.run(worker)
    })

    expect(worker).toHaveBeenCalledTimes(1)
    expect(hook.result.current.rows.map((r) => r.status)).toEqual(['ok', 'ok'])
  })

  it('`finish` corre al final, con el resumen y dentro de «running»', async () => {
    const hook = setup([row(1), row(2)])
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const finish = vi.fn(() => gate)
    let pending: Promise<unknown> = Promise.resolve()

    await act(async () => {
      pending = hook.result.current.run(async (item) => {
        if (item.id === 2) throw new Error('x')
      }, finish)

      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(finish).toHaveBeenCalledWith({ ok: 1, failed: 1 })
    expect(hook.result.current.running).toBe(true)

    await act(async () => {
      release()
      await pending
    })

    expect(hook.result.current.running).toBe(false)
  })

  it('si `finish` lanza, `running` se libera igualmente', async () => {
    const hook = setup([row(1)])

    await act(async () => {
      await expect(
        hook.result.current.run(
          async () => {},
          async () => {
            throw new Error('proceso')
          },
        ),
      ).rejects.toThrow('proceso')
    })

    expect(hook.result.current.running).toBe(false)
  })
})

'use client'

import { useCallback, useState } from 'react'

export type QueueStatus = 'pending' | 'uploading' | 'ok' | 'error'

export type QueueRow = {
  status: QueueStatus
  error?: string
}

export type QueueSummary = { ok: number; failed: number }

type Key = string | number

// Núcleo común de las colas de subida del admin (pines en lote y CVs de
// Talent): lista de filas con estado propio y subida SECUENCIAL, una fila
// cada vez. No decide qué es una fila ni cómo se sube: cada pantalla aporta su
// `worker`. Las filas ya subidas («ok») se saltan, así que reintentar un lote
// solo repite las que fallaron.
export function useUploadQueue<T extends QueueRow>(getKey: (row: T) => Key) {
  const [rows, setRows] = useState<T[]>([])
  const [running, setRunning] = useState(false)

  const updateRow = useCallback(
    (key: Key, patch: Partial<T>) => {
      setRows((current) =>
        current.map((row) =>
          getKey(row) === key ? { ...row, ...patch } : row,
        ),
      )
    },
    [getKey],
  )

  // `worker` sube una fila y devuelve, si quiere, campos extra para fusionar
  // en ella (p. ej. un aviso). Si lanza, la fila queda en «error» con el
  // mensaje del Error. `finish` corre dentro de la misma ventana de
  // «running», cuando ya se han recorrido todas las filas.
  async function run(
    worker: (row: T) => Promise<Partial<T> | void>,
    finish?: (summary: QueueSummary) => Promise<void>,
  ): Promise<QueueSummary> {
    const summary: QueueSummary = { ok: 0, failed: 0 }

    setRunning(true)

    try {
      for (const row of rows) {
        if (row.status === 'ok') continue

        const key = getKey(row)

        updateRow(key, { status: 'uploading', error: undefined } as Partial<T>)

        try {
          const extra = await worker(row)

          summary.ok += 1
          updateRow(key, { ...(extra ?? {}), status: 'ok' } as Partial<T>)
        } catch (error) {
          summary.failed += 1
          updateRow(key, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Error al subir.',
          } as Partial<T>)
        }
      }

      await finish?.(summary)
    } finally {
      setRunning(false)
    }

    return summary
  }

  return { rows, setRows, updateRow, running, run }
}

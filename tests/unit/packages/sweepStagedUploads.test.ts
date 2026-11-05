import { describe, expect, it, vi } from 'vitest'

import {
  STAGED_SWEEP_MAX_FOLDERS,
  STAGED_SWEEP_REMOVE_BATCH,
  makeSweepStagedUploads,
} from '@/modules/packages/application/sweepStagedUploads'
import {
  STAGED_UPLOAD_MAX_AGE_MS,
  isStagedPackagePath,
  stagedPackagePath,
} from '@/modules/packages/domain/packageFiles'
import type {
  StagedUploadFile,
  StagedUploadSweeper,
} from '@/modules/packages/domain/packageUploadPorts'

const NOW = Date.UTC(2026, 9, 29, 12, 0, 0)
const HOUR = 60 * 60 * 1000
const CONTENT = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

function file(n: number, ageMs: number | null): StagedUploadFile {
  const id = `4f1b2c3d-5e6f-4a7b-8c9d-${String(n).padStart(12, '0')}`

  return {
    path: stagedPackagePath(CONTENT, id),
    createdAt: ageMs === null ? null : NOW - ageMs,
  }
}

function setup(files: StagedUploadFile[], truncated = false) {
  const removed: string[][] = []
  const sweeper: StagedUploadSweeper = {
    listStaged: vi.fn(async () => ({ files, truncated })),
    remove: vi.fn(async (paths: string[]) => {
      removed.push(paths)

      return paths.length
    }),
  }

  return {
    sweeper,
    removed,
    sweep: makeSweepStagedUploads({ sweeper, now: () => NOW }),
  }
}

describe('limpieza de _incoming', () => {
  it('borra las subidas de más de 24 horas y deja las recientes', async () => {
    const old = file(1, 25 * HOUR)
    const recent = file(2, 2 * HOUR)
    const { sweep, removed } = setup([old, recent])

    const result = await sweep()

    expect(removed).toEqual([[old.path]])
    expect(result).toEqual({
      scanned: 2,
      deleted: 1,
      failed: 0,
      truncated: false,
    })
  })

  it('el margen es exactamente de 24 horas: justo en el límite no se borra', async () => {
    const { sweep, removed } = setup([
      file(1, STAGED_UPLOAD_MAX_AGE_MS),
      file(2, STAGED_UPLOAD_MAX_AGE_MS + 1),
    ])

    await sweep()

    expect(removed).toHaveLength(1)
    expect(removed[0]).toHaveLength(1)
  })

  it('una subida sin fecha conocida no se borra', async () => {
    const { sweep, sweeper } = setup([file(1, null)])

    expect((await sweep()).deleted).toBe(0)
    expect(sweeper.remove).not.toHaveBeenCalled()
  })

  it('sin nada que limpiar no llama a borrar', async () => {
    const { sweep, sweeper } = setup([])

    expect(await sweep()).toEqual({
      scanned: 0,
      deleted: 0,
      failed: 0,
      truncated: false,
    })
    expect(sweeper.remove).not.toHaveBeenCalled()
  })

  it('borra por lotes', async () => {
    const files = Array.from(
      { length: STAGED_SWEEP_REMOVE_BATCH * 2 + 5 },
      (_, i) => file(i, 48 * HOUR),
    )
    const { sweep, removed } = setup(files)

    const result = await sweep()

    expect(removed.map((batch) => batch.length)).toEqual([
      STAGED_SWEEP_REMOVE_BATCH,
      STAGED_SWEEP_REMOVE_BATCH,
      5,
    ])
    expect(result.deleted).toBe(files.length)
  })

  it('un lote que falla se cuenta y no corta la pasada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const files = Array.from(
      { length: STAGED_SWEEP_REMOVE_BATCH + 3 },
      (_, i) => file(i, 48 * HOUR),
    )
    const { sweeper, sweep } = setup(files)

    vi.mocked(sweeper.remove).mockRejectedValueOnce(new Error('Storage caído'))

    const result = await sweep()

    expect(result).toMatchObject({
      deleted: 3,
      failed: STAGED_SWEEP_REMOVE_BATCH,
    })
    expect(sweeper.remove).toHaveBeenCalledTimes(2)
  })

  it('avisa de que quedaron contenidos sin revisar y limita cuántos mira', async () => {
    const { sweep, sweeper } = setup([file(1, 48 * HOUR)], true)

    expect((await sweep()).truncated).toBe(true)
    expect(sweeper.listStaged).toHaveBeenCalledWith(STAGED_SWEEP_MAX_FOLDERS)
  })

  it('si no se puede ni listar, el error sube para que la ruta responda 503', async () => {
    const { sweeper, sweep } = setup([])

    vi.mocked(sweeper.listStaged).mockRejectedValueOnce(new Error('sin red'))

    await expect(sweep()).rejects.toThrow('sin red')
  })
})

describe('isStagedPackagePath', () => {
  it('reconoce solo la forma exacta _incoming/<uuid>/<uuid>.zip', () => {
    expect(isStagedPackagePath(file(1, 0).path)).toBe(true)
    expect(isStagedPackagePath(`${CONTENT}/v1/index.html`)).toBe(false)
    expect(isStagedPackagePath(`_incoming/${CONTENT}/notas.txt`)).toBe(false)
    expect(
      isStagedPackagePath(`_incoming/${CONTENT}/.emptyFolderPlaceholder`),
    ).toBe(false)
    expect(isStagedPackagePath(`_incoming/../${CONTENT}/a.zip`)).toBe(false)
  })
})

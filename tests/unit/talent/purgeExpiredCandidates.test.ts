import { describe, expect, it, vi } from 'vitest'

import {
  makePurgeExpiredCandidates,
  PURGE_MAX_BATCH,
} from '@/modules/talent/application/purgeExpiredCandidates'
import type { CandidateDeletionTarget } from '@/modules/talent/domain/talentAdminModels'
import { fakeAdminRepository, fakeStorage } from '@tests/helpers/talentFakes'

const NOW = new Date('2026-10-20T10:00:00Z')
const OLD = '2024-10-19T10:00:00.000000'
const RECENT = '2025-03-01T10:00:00.000000'
const DRIVE = 'https://drive.google.com/file/d/abc/view'

function target(
  id: string,
  overrides: Partial<CandidateDeletionTarget> = {},
): CandidateDeletionTarget {
  return {
    id,
    bucketPaths: [`uploads/${id}.pdf`],
    externalPaths: [DRIVE],
    createdAt: OLD,
    newsletterAccepted: false,
    ...overrides,
  }
}

function setup(
  targets: CandidateDeletionTarget[],
  expiredIds = targets.map((item) => item.id),
  now: Date = NOW,
) {
  const repo = fakeAdminRepository({
    deletionTargets: Object.fromEntries(targets.map((item) => [item.id, item])),
    expiredIds,
  })
  const storage = fakeStorage()
  const recordAudit = vi.fn(async () => true)

  return {
    ...repo,
    ...storage,
    recordAudit,
    purge: makePurgeExpiredCandidates({
      admin: repo.admin,
      storage: storage.storage,
      now: () => now,
      recordAudit,
    }),
  }
}

describe('purgeExpiredCandidates.list', () => {
  it('devuelve los caducados con sus enlaces de Drive y no borra nada', async () => {
    const { purge, deletedIds, remove } = setup([target('a'), target('b')])

    expect(await purge.list(10)).toEqual({
      expired: [
        { id: 'a', bucketFiles: 1, externalLinks: [DRIVE] },
        { id: 'b', bucketFiles: 1, externalLinks: [DRIVE] },
      ],
      more: false,
    })
    expect(deletedIds).toEqual([])
    expect(remove).not.toHaveBeenCalled()
  })

  it('avisa de que hay más cuando el repositorio devuelve uno por encima del tope', async () => {
    const { purge } = setup([target('a'), target('b'), target('c')])

    const result = await purge.list(2)

    expect(result.expired.map((item) => item.id)).toEqual(['a', 'b'])
    expect(result.more).toBe(true)
  })

  it('descarta lo que el repositorio dio por caducado pero el criterio no', async () => {
    const { purge } = setup([target('a'), target('b', { createdAt: RECENT })])

    expect((await purge.list(10)).expired.map((item) => item.id)).toEqual(['a'])
  })

  it('el tope se acota a 1..50', async () => {
    const ids = Array.from({ length: 60 }, (_, index) => `id${index}`)
    const { purge } = setup(ids.map((id) => target(id)))

    expect((await purge.list(1000)).expired).toHaveLength(PURGE_MAX_BATCH)
    expect((await purge.list(0)).expired).toHaveLength(1)
  })
})

describe('purgeExpiredCandidates.purge', () => {
  it('borra los caducados, devuelve sus enlaces y lo deja en Actividad', async () => {
    const { purge, deletedIds, remove, recordAudit } = setup([target('a')])

    expect(await purge.purge(['a'])).toEqual([
      { status: 'deleted', id: 'a', bucketFiles: 1, externalLinks: [DRIVE] },
    ])
    expect(remove).toHaveBeenCalledWith('uploads/a.pdf')
    expect(deletedIds).toEqual(['a'])
    expect(recordAudit).toHaveBeenCalledWith({
      action: 'talent.candidate_purge',
      entityId: 'a',
      payload: { bucketFiles: 1, externalFiles: 1 },
    })
  })

  it('NO borra a un candidato vigente aunque se pida su id', async () => {
    const { purge, deletedIds, remove, recordAudit } = setup([
      target('a', { createdAt: RECENT }),
    ])

    expect(await purge.purge(['a'])).toEqual([
      { status: 'not_expired', id: 'a' },
    ])
    expect(deletedIds).toEqual([])
    expect(remove).not.toHaveBeenCalled()
    expect(recordAudit).not.toHaveBeenCalled()
  })

  it('sin fecha, solo caduca a partir del 20 de octubre de 2027', async () => {
    const undated = target('a', { createdAt: null })

    expect(await setup([undated]).purge.purge(['a'])).toEqual([
      { status: 'not_expired', id: 'a' },
    ])

    const later = setup([undated], undefined, new Date('2027-10-20T00:00:01Z'))

    expect((await later.purge.purge(['a']))[0].status).toBe('deleted')
  })

  it('un id que no existe es not_found y repetir la llamada es seguro', async () => {
    const { purge } = setup([target('a')])

    expect(await purge.purge(['zzz'])).toEqual([
      { status: 'not_found', id: 'zzz' },
    ])
  })

  it('ids repetidos se procesan una vez', async () => {
    const { purge, deletedIds } = setup([target('a')])

    expect(await purge.purge(['a', 'a'])).toHaveLength(1)
    expect(deletedIds).toEqual(['a'])
  })

  it('si falla el bucket no borra las filas, lo marca error y sigue con el resto', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { purge, deletedIds, remove } = setup([target('a'), target('b')])

    remove.mockRejectedValueOnce(new Error('storage caído'))

    expect(await purge.purge(['a', 'b'])).toEqual([
      { status: 'error', id: 'a' },
      { status: 'deleted', id: 'b', bucketFiles: 1, externalLinks: [DRIVE] },
    ])
    expect(deletedIds).toEqual(['b'])
    expect(log).toHaveBeenCalled()
  })

  it('si Actividad no se puede escribir, el borrado se mantiene', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { purge, deletedIds, recordAudit } = setup([target('a')])

    recordAudit.mockResolvedValueOnce(false)

    expect((await purge.purge(['a']))[0].status).toBe('deleted')
    expect(deletedIds).toEqual(['a'])
    expect(log).toHaveBeenCalled()
  })

  it('procesa como mucho 50 ids por llamada', async () => {
    const ids = Array.from({ length: 60 }, (_, index) => `id${index}`)
    const { purge } = setup(ids.map((id) => target(id)))

    expect(await purge.purge(ids)).toHaveLength(PURGE_MAX_BATCH)
  })
})

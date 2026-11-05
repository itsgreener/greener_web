import { describe, expect, it, vi } from 'vitest'

import { makeDeleteCandidate } from '@/modules/talent/application/deleteCandidate'
import type { CandidateDeletionTarget } from '@/modules/talent/domain/talentAdminModels'
import {
  CANDIDATE_ID,
  fakeAdminRepository,
  fakeStorage,
} from '@tests/helpers/talentFakes'

function target(
  overrides: Partial<CandidateDeletionTarget> = {},
): CandidateDeletionTarget {
  return {
    id: CANDIDATE_ID,
    bucketPaths: ['uploads/a.pdf', 'uploads/b.png'],
    externalPaths: [],
    createdAt: null,
    newsletterAccepted: false,
    ...overrides,
  }
}

function setup(t: CandidateDeletionTarget | null = target()) {
  const repo = fakeAdminRepository({
    deletionTargets: t ? { [CANDIDATE_ID]: t } : {},
  })
  const storage = fakeStorage()

  return {
    ...repo,
    ...storage,
    run: () =>
      makeDeleteCandidate({ admin: repo.admin, storage: storage.storage })(
        CANDIDATE_ID,
      ),
  }
}

describe('deleteCandidate', () => {
  it('borra los objetos del bucket y después las filas', async () => {
    const { run, remove, calls, deletedIds } = setup()

    expect(await run()).toEqual({
      ok: true,
      bucketFiles: 2,
      externalFiles: 0,
      newsletterAccepted: false,
    })
    expect(remove.mock.calls.map(([path]) => path)).toEqual([
      'uploads/a.pdf',
      'uploads/b.png',
    ])
    expect(calls).toEqual(['findDeletionTarget', 'deleteCandidateRows'])
    expect(deletedIds).toEqual([CANDIDATE_ID])
  })

  it('avisa de lo que no puede borrar: Drive y la suscripción', async () => {
    const { run } = setup(
      target({
        bucketPaths: [],
        externalPaths: [
          'https://drive.google.com/file/d/a/view',
          'https://drive.google.com/file/d/b/view',
        ],
        newsletterAccepted: true,
      }),
    )

    expect(await run()).toEqual({
      ok: true,
      bucketFiles: 0,
      externalFiles: 2,
      newsletterAccepted: true,
    })
  })

  it('un candidato sin ficheros se borra igual, sin tocar el bucket', async () => {
    const { run, remove, deletedIds } = setup(target({ bucketPaths: [] }))

    expect((await run()).ok).toBe(true)
    expect(remove).not.toHaveBeenCalled()
    expect(deletedIds).toEqual([CANDIDATE_ID])
  })

  it('un candidato que no existe: not_found, sin borrar nada', async () => {
    const { run, remove, deletedIds } = setup(null)

    expect(await run()).toEqual({ ok: false, reason: 'not_found' })
    expect(remove).not.toHaveBeenCalled()
    expect(deletedIds).toEqual([])
  })

  it('si falla el bucket no se borran las filas (no quedan CVs huérfanos)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { run, remove, deletedIds } = setup()

    remove.mockRejectedValueOnce(new Error('storage caído'))

    expect(await run()).toEqual({ ok: false, reason: 'unavailable' })
    expect(deletedIds).toEqual([])
    error.mockRestore()
  })

  it('si falla el borrado de las filas se puede repetir', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { run, failOn, deletedIds } = setup()

    failOn.add('deleteCandidateRows')

    expect(await run()).toEqual({ ok: false, reason: 'unavailable' })

    failOn.delete('deleteCandidateRows')

    expect((await run()).ok).toBe(true)
    expect(deletedIds).toEqual([CANDIDATE_ID])
    error.mockRestore()
  })
})

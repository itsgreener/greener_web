import { beforeEach, describe, expect, it, vi } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

const listVersions = vi.fn()
const deleteVersion = vi.fn()

vi.mock(
  '@/modules/packages/infrastructure/supabaseHtmlPackageRepository',
  () => ({
    supabaseHtmlPackageRepository: {
      listVersions: (...args: unknown[]) => listVersions(...args),
      deleteVersion: (...args: unknown[]) => deleteVersion(...args),
    },
  }),
)

import {
  deleteHtmlPackageVersion,
  deleteOldHtmlPackageVersions,
} from '@/modules/packages/application/deleteHtmlPackageVersion'

const v = (n: number, status: 'draft' | 'published' | 'rolled_back') => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  version: n,
  status,
  createdAt: '2026-10-07T10:00:00Z',
  storagePath: `${CONTENT_ID}/v${n}`,
})

beforeEach(() => {
  vi.clearAllMocks()
  deleteVersion.mockResolvedValue({ storagePath: 'x', storageFailed: 0 })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('deleteOldHtmlPackageVersions', () => {
  it('borra solo las rolled_back: ni la publicada ni los borradores', async () => {
    listVersions.mockResolvedValue([
      v(5, 'draft'),
      v(4, 'published'),
      v(3, 'rolled_back'),
      v(2, 'rolled_back'),
      v(1, 'rolled_back'),
    ])

    const result = await deleteOldHtmlPackageVersions(CONTENT_ID)

    expect(result).toMatchObject({ deleted: 3, total: 3, storageFailed: 0 })
    expect(deleteVersion.mock.calls.map((c) => c[0].versionId)).toEqual([
      v(3, 'rolled_back').id,
      v(2, 'rolled_back').id,
      v(1, 'rolled_back').id,
    ])
  })

  it('suma los ficheros de Storage que no se pudieron borrar', async () => {
    listVersions.mockResolvedValue([v(2, 'rolled_back'), v(1, 'rolled_back')])
    deleteVersion
      .mockResolvedValueOnce({ storagePath: 'x', storageFailed: 2 })
      .mockResolvedValueOnce({ storagePath: 'y', storageFailed: 3 })

    const result = await deleteOldHtmlPackageVersions(CONTENT_ID)

    expect(result.storageFailed).toBe(5)
  })

  it('si una falla, se detiene e informa de cuántas se borraron', async () => {
    listVersions.mockResolvedValue([
      v(3, 'rolled_back'),
      v(2, 'rolled_back'),
      v(1, 'rolled_back'),
    ])
    deleteVersion
      .mockResolvedValueOnce({ storagePath: 'x', storageFailed: 0 })
      .mockRejectedValueOnce(new Error('boom'))

    const result = await deleteOldHtmlPackageVersions(CONTENT_ID)

    expect(result.deleted).toBe(1)
    expect(result.total).toBe(3)
    expect(result.error).toBeInstanceOf(Error)
    expect(deleteVersion).toHaveBeenCalledTimes(2)
  })

  it('sin versiones anteriores no borra nada', async () => {
    listVersions.mockResolvedValue([v(1, 'published')])

    const result = await deleteOldHtmlPackageVersions(CONTENT_ID)

    expect(result).toMatchObject({ deleted: 0, total: 0 })
    expect(deleteVersion).not.toHaveBeenCalled()
  })

  it('rechaza un contentId que no es uuid', async () => {
    await expect(deleteOldHtmlPackageVersions('nope')).rejects.toThrow()
    expect(listVersions).not.toHaveBeenCalled()
  })
})

describe('deleteHtmlPackageVersion', () => {
  it('valida los ids antes de delegar en el repositorio', async () => {
    await expect(
      deleteHtmlPackageVersion({ contentId: 'x', versionId: 'y' }),
    ).rejects.toThrow()
    expect(deleteVersion).not.toHaveBeenCalled()

    await deleteHtmlPackageVersion({
      contentId: CONTENT_ID,
      versionId: v(1, 'draft').id,
    })
    expect(deleteVersion).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      versionId: v(1, 'draft').id,
    })
  })
})

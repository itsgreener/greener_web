import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/media/infrastructure/cloudinaryServer', () => ({
  deleteCloudinaryAsset: vi.fn(),
  isManagedPublicId: (id: string) => id.startsWith('greener/content/'),
}))

vi.mock('@/modules/media/infrastructure/supabaseMediaRefs', () => ({
  findExistingMediaIds: vi.fn(),
  isPublicIdRegistered: vi.fn(),
  listContentMediaRefs: vi.fn(),
  listPinMediaRefs: vi.fn(),
}))

import {
  discardUnregisteredUpload,
  purgeRemovedMedia,
  snapshotContentMedia,
  snapshotPinMedia,
} from '@/modules/media/application/cleanupMedia'
import { deleteCloudinaryAsset } from '@/modules/media/infrastructure/cloudinaryServer'
import {
  findExistingMediaIds,
  isPublicIdRegistered,
  listContentMediaRefs,
  listPinMediaRefs,
} from '@/modules/media/infrastructure/supabaseMediaRefs'

const mockDelete = vi.mocked(deleteCloudinaryAsset)
const mockExisting = vi.mocked(findExistingMediaIds)
const mockRegistered = vi.mocked(isPublicIdRegistered)
const mockPinRefs = vi.mocked(listPinMediaRefs)
const mockContentRefs = vi.mocked(listContentMediaRefs)

const IMG = {
  mediaId: 'm1',
  cloudinaryPublicId: 'greener/content/a',
  kind: 'image' as const,
}
const VID = {
  mediaId: 'm2',
  cloudinaryPublicId: 'greener/content/videos/b',
  kind: 'video' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockDelete.mockResolvedValue(undefined)
})

describe('purgeRemovedMedia', () => {
  it('borra de Cloudinary solo lo que Postgres ya no tiene, con su tipo (imagen/vídeo)', async () => {
    mockExisting.mockResolvedValueOnce(new Set(['m1']))

    const result = await purgeRemovedMedia([IMG, VID])

    expect(result).toEqual({ purged: 1, failed: 0 })
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockDelete).toHaveBeenCalledWith('greener/content/videos/b', 'video')
  })

  it('un medio que sigue referenciado (lo usa otro pin) NO se borra', async () => {
    mockExisting.mockResolvedValueOnce(new Set(['m1', 'm2']))

    expect(await purgeRemovedMedia([IMG, VID])).toEqual({
      purged: 0,
      failed: 0,
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('si no puede comprobar qué sigue en uso, NO borra nada (más vale basura que romper algo en uso)', async () => {
    mockExisting.mockRejectedValueOnce(new Error('db caída'))

    expect(await purgeRemovedMedia([IMG, VID])).toEqual({
      purged: 0,
      failed: 2,
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('nunca toca un public id fuera de greener/content/', async () => {
    mockExisting.mockResolvedValueOnce(new Set())

    const foreign = {
      mediaId: 'm9',
      cloudinaryPublicId: 'otra-carpeta/x',
      kind: 'image' as const,
    }

    expect(await purgeRemovedMedia([foreign])).toEqual({ purged: 0, failed: 0 })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('si Cloudinary falla en un archivo, sigue con el resto y lo cuenta como fallo', async () => {
    mockExisting.mockResolvedValueOnce(new Set())
    mockDelete.mockRejectedValueOnce(new Error('rate limit'))

    expect(await purgeRemovedMedia([IMG, VID])).toEqual({
      purged: 1,
      failed: 1,
    })
    expect(mockDelete).toHaveBeenCalledTimes(2)
  })

  it('sin medios no consulta nada', async () => {
    expect(await purgeRemovedMedia([])).toEqual({ purged: 0, failed: 0 })
    expect(mockExisting).not.toHaveBeenCalled()
  })
})

describe('snapshots', () => {
  it('devuelven los medios leídos', async () => {
    mockPinRefs.mockResolvedValueOnce([IMG])
    mockContentRefs.mockResolvedValueOnce([VID])

    expect(await snapshotPinMedia('p')).toEqual([IMG])
    expect(await snapshotContentMedia('c')).toEqual([VID])
  })

  it('si la lectura falla devuelven [] y NO lanzan: borrar el pin/contenido no puede depender de esto', async () => {
    mockPinRefs.mockRejectedValueOnce(new Error('x'))
    mockContentRefs.mockRejectedValueOnce(new Error('x'))

    expect(await snapshotPinMedia('p')).toEqual([])
    expect(await snapshotContentMedia('c')).toEqual([])
  })
})

describe('discardUnregisteredUpload', () => {
  it('borra un archivo subido que no llegó a registrarse', async () => {
    mockRegistered.mockResolvedValueOnce(false)

    expect(
      await discardUnregisteredUpload('greener/content/videos/x', 'video'),
    ).toBe(true)
    expect(mockDelete).toHaveBeenCalledWith('greener/content/videos/x', 'video')
  })

  it('NO borra uno que sí está registrado', async () => {
    mockRegistered.mockResolvedValueOnce(true)

    expect(await discardUnregisteredUpload('greener/content/a', 'image')).toBe(
      false,
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('NO toca nada fuera de greener/content/, aunque el navegador lo pida', async () => {
    expect(await discardUnregisteredUpload('../otra/cosa', 'image')).toBe(false)
    expect(mockRegistered).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('nunca lanza: un fallo de Cloudinary o de la base devuelve false', async () => {
    mockRegistered.mockRejectedValueOnce(new Error('db'))
    expect(await discardUnregisteredUpload('greener/content/a', 'image')).toBe(
      false,
    )

    mockRegistered.mockResolvedValueOnce(false)
    mockDelete.mockRejectedValueOnce(new Error('cloud'))
    expect(await discardUnregisteredUpload('greener/content/a', 'image')).toBe(
      false,
    )
  })
})

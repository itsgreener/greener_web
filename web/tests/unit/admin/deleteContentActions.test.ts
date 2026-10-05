import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('@/modules/content/application/deleteContent', () => ({
  deleteContent: vi.fn(),
}))

vi.mock('@/modules/media/application/cleanupMedia', () => ({
  snapshotContentMedia: vi.fn(),
  purgeRemovedMedia: vi.fn(),
}))

import { deleteContentAction } from '@/app/admin/contents/[id]/edit/deleteActions'
import { deleteContent } from '@/modules/content/application/deleteContent'
import {
  purgeRemovedMedia,
  snapshotContentMedia,
} from '@/modules/media/application/cleanupMedia'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

const REFS = [
  {
    mediaId: 'm1',
    cloudinaryPublicId: 'greener/content/a',
    kind: 'image' as const,
  },
]

function form() {
  const data = new FormData()
  data.set('id', CONTENT_ID)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(snapshotContentMedia).mockResolvedValue(REFS)
  vi.mocked(purgeRemovedMedia).mockResolvedValue({ purged: 1, failed: 0 })
  vi.mocked(deleteContent).mockResolvedValue(CONTENT_ID)
})

describe('deleteContentAction — limpieza de Cloudinary (5 oct 2026)', () => {
  it('lee los medios ANTES de borrar y purga los archivos DESPUÉS, antes de redirigir', async () => {
    const order: string[] = []

    vi.mocked(snapshotContentMedia).mockImplementationOnce(async () => {
      order.push('snapshot')
      return REFS
    })
    vi.mocked(deleteContent).mockImplementationOnce(async () => {
      order.push('delete')
      return CONTENT_ID
    })
    vi.mocked(purgeRemovedMedia).mockImplementationOnce(async () => {
      order.push('purge')
      return { purged: 1, failed: 0 }
    })

    await expect(deleteContentAction({}, form())).rejects.toThrow(
      'NEXT_REDIRECT',
    )

    expect(order).toEqual(['snapshot', 'delete', 'purge'])
    expect(purgeRemovedMedia).toHaveBeenCalledWith(REFS)
  })

  it('si el borrado en Postgres falla (p. ej. no es draft), NO borra nada en Cloudinary', async () => {
    vi.mocked(deleteContent).mockRejectedValueOnce(
      new Error('Only draft content can be deleted'),
    )

    const result = await deleteContentAction({}, form())

    expect(result.error).toBe(
      'Solo se pueden eliminar contenidos en estado draft.',
    )
    expect(purgeRemovedMedia).not.toHaveBeenCalled()
  })

  it('un fallo al borrar archivos no impide completar el borrado (queda en log para el reconciliador)', async () => {
    vi.mocked(purgeRemovedMedia).mockResolvedValueOnce({ purged: 0, failed: 1 })

    await expect(deleteContentAction({}, form())).rejects.toThrow(
      'NEXT_REDIRECT',
    )
    expect(console.error).toHaveBeenCalled()
  })

  it('un id inválido ni lee medios ni borra', async () => {
    const bad = new FormData()
    bad.set('id', 'no-uuid')

    const result = await deleteContentAction({}, bad)

    expect(result.error).toBeDefined()
    expect(snapshotContentMedia).not.toHaveBeenCalled()
    expect(deleteContent).not.toHaveBeenCalled()
  })
})

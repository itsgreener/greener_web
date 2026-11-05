import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dbError } from '@tests/helpers/dbError'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('@/modules/content/container', () => ({
  deleteContent: vi.fn(),
}))

import { deleteContentAction } from '@/app/admin/(panel)/contents/[id]/edit/deleteActions'
import { deleteContent } from '@/modules/content/container'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

function form() {
  const data = new FormData()
  data.set('id', CONTENT_ID)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(deleteContent).mockResolvedValue({ purged: 1, failed: 0 })
})

describe('deleteContentAction — limpieza de Cloudinary (5 oct 2026)', () => {
  // El orden leer → borrar → purgar vive en el caso de uso `deleteContent`
  // y se prueba en tests/unit/content/applicationLayer.test.ts.
  it('borra con el caso de uso y redirige al listado', async () => {
    await expect(deleteContentAction({}, form())).rejects.toThrow(
      'NEXT_REDIRECT',
    )

    expect(deleteContent).toHaveBeenCalledWith({ id: CONTENT_ID })
  })

  it('si el borrado en Postgres falla (p. ej. no es draft), devuelve un error legible y no redirige', async () => {
    vi.mocked(deleteContent).mockRejectedValueOnce(
      dbError('ZG015', 'Only draft content can be deleted'),
    )

    const result = await deleteContentAction({}, form())

    expect(result.error).toBe(
      'Solo se pueden eliminar contenidos en estado draft.',
    )
  })

  it('un fallo al borrar archivos no impide completar el borrado (queda en log para el reconciliador)', async () => {
    vi.mocked(deleteContent).mockResolvedValueOnce({ purged: 0, failed: 1 })

    await expect(deleteContentAction({}, form())).rejects.toThrow(
      'NEXT_REDIRECT',
    )
    expect(console.error).toHaveBeenCalled()
  })

  it('un id inválido no llega a borrar', async () => {
    const bad = new FormData()
    bad.set('id', 'no-uuid')

    const result = await deleteContentAction({}, bad)

    expect(result.error).toBeDefined()
    expect(deleteContent).not.toHaveBeenCalled()
  })
})

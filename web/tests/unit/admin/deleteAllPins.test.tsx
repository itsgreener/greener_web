// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/app/admin/contents/[id]/edit/PinMediaManager', () => ({
  default: () => null,
}))

vi.mock('@/modules/pin/application/listPins', () => ({ listPins: vi.fn() }))
vi.mock('@/modules/pin/application/deletePin', () => ({ deletePin: vi.fn() }))
vi.mock('@/modules/pin/application/createPin', () => ({ createPin: vi.fn() }))
vi.mock('@/modules/pin/application/updatePin', () => ({ updatePin: vi.fn() }))
vi.mock('@/modules/pin/application/attachPinImage', () => ({
  attachPinImage: vi.fn(),
}))
vi.mock('@/modules/pin/application/attachPinVideo', () => ({
  attachPinVideo: vi.fn(),
}))
vi.mock('@/modules/pin/application/detachPinMedia', () => ({
  detachPinMedia: vi.fn(),
}))
vi.mock('@/modules/media/application/cleanupMedia', () => ({
  snapshotPinMedia: vi.fn(),
  purgeRemovedMedia: vi.fn(),
}))
vi.mock('@/modules/media/infrastructure/cloudinaryServer', () => ({
  CloudinaryImageVerificationError: class extends Error {},
  CloudinaryVideoVerificationError: class extends Error {},
  deleteCloudinaryAsset: vi.fn(),
  verifyCloudinaryImageAsset: vi.fn(),
  verifyCloudinaryVideoAsset: vi.fn(),
}))

import { resetEditorLockForTests } from '@/app/admin/contents/[id]/edit/editorLock'
import { deleteAllPinsAction } from '@/app/admin/contents/[id]/edit/pinActions'
import { listPins } from '@/modules/pin/application/listPins'
import { deletePin } from '@/modules/pin/application/deletePin'
import {
  purgeRemovedMedia,
  snapshotPinMedia,
} from '@/modules/media/application/cleanupMedia'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'
const pinIds = [
  '22222222-2222-4222-8222-222222222221',
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222223',
]

const REFS = (id: string) => [
  { mediaId: `m-${id}`, cloudinaryPublicId: `greener/${id}`, kind: 'image' },
]

beforeEach(() => {
  // Tras un borrado correcto el cerrojo se queda tomado hasta la recarga de
  // la página; entre tests hay que reiniciarlo.
  resetEditorLockForTests()
  vi.clearAllMocks()
  vi.mocked(listPins).mockResolvedValue(
    pinIds.map((id) => ({ id })) as Awaited<ReturnType<typeof listPins>>,
  )
  vi.mocked(snapshotPinMedia).mockImplementation(
    async (id: string) => REFS(id) as never,
  )
  vi.mocked(deletePin).mockResolvedValue('x')
  vi.mocked(purgeRemovedMedia).mockResolvedValue({ purged: 3, failed: 0 })
})

describe('deleteAllPinsAction', () => {
  it('borra todos los pines del contenido y purga sus archivos una sola vez', async () => {
    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result).toEqual({ success: true })
    expect(deletePin).toHaveBeenCalledTimes(3)
    expect(vi.mocked(deletePin).mock.calls.map((c) => c[0])).toEqual(
      pinIds.map((id) => ({ id })),
    )
    expect(purgeRemovedMedia).toHaveBeenCalledTimes(1)
    expect(vi.mocked(purgeRemovedMedia).mock.calls[0][0]).toHaveLength(3)
  })

  it('lee los medios de cada pin ANTES de borrarlo', async () => {
    const order: string[] = []

    vi.mocked(snapshotPinMedia).mockImplementation(async (id: string) => {
      order.push(`snapshot:${id.slice(-1)}`)
      return REFS(id) as never
    })
    vi.mocked(deletePin).mockImplementation(async (input) => {
      order.push(`delete:${input.id.slice(-1)}`)
      return 'x'
    })

    await deleteAllPinsAction(CONTENT_ID)

    expect(order).toEqual([
      'snapshot:1',
      'delete:1',
      'snapshot:2',
      'delete:2',
      'snapshot:3',
      'delete:3',
    ])
  })

  it('si un borrado falla se detiene, dice cuántos se borraron y purga solo los ya borrados', async () => {
    vi.mocked(deletePin)
      .mockResolvedValueOnce('x')
      .mockRejectedValueOnce(new Error('boom'))

    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result.success).toBeUndefined()
    expect(result.formError).toContain('Se han borrado 1 de 3 pines')
    expect(deletePin).toHaveBeenCalledTimes(2)
    expect(vi.mocked(purgeRemovedMedia).mock.calls[0][0]).toHaveLength(1)
  })

  it('avisa si Cloudinary no pudo borrar algún archivo, dando los pines por borrados', async () => {
    vi.mocked(purgeRemovedMedia).mockResolvedValue({ purged: 1, failed: 2 })

    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result.success).toBe(true)
    expect(result.warning).toContain('2 archivo(s)')
  })

  it('un contenido sin pines no borra nada', async () => {
    vi.mocked(listPins).mockResolvedValue([])

    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result.formError).toBe('Este contenido no tiene pines que borrar.')
    expect(deletePin).not.toHaveBeenCalled()
  })

  it('rechaza un identificador de contenido que no es uuid', async () => {
    const result = await deleteAllPinsAction('no-uuid')

    expect(result.formError).toBe(
      'El identificador del contenido no es válido.',
    )
    expect(listPins).not.toHaveBeenCalled()
  })

  it('si no se pueden leer los pines, no borra nada', async () => {
    vi.mocked(listPins).mockRejectedValue(new Error('boom'))

    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result.formError).toBe(
      'No se han podido leer los pines del contenido.',
    )
    expect(deletePin).not.toHaveBeenCalled()
  })
})

describe('PinList — botón «Borrar todos los pines»', () => {
  function pin(id: string) {
    return {
      id,
      contentId: CONTENT_ID,
      ratio: '1:1',
      label: null,
      language: 'es',
      autoplayMode: null,
      alt: 'alt',
      createdAt: '2026-10-07',
      media: [],
    }
  }

  async function renderList(
    contentType: string,
    pins: ReturnType<typeof pin>[],
  ) {
    const { default: PinList } =
      await import('@/app/admin/contents/[id]/edit/PinList')

    render(
      <PinList contentId={CONTENT_ID} contentType={contentType} pins={pins} />,
    )
  }

  it.each(['tool', 'case', 'episode', 'insight', 'other'])(
    '%s: aparece con el recuento y borra tras confirmar',
    async (type) => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      // jsdom no implementa la navegación; solo importa que no explote.
      await renderList(type, pinIds.map(pin))

      fireEvent.click(
        screen.getByRole('button', { name: 'Borrar todos los pines (3)' }),
      )

      await waitFor(() => expect(deletePin).toHaveBeenCalledTimes(3))
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('los 3 pines'),
      )
    },
  )

  it('no borra nada si se cancela la confirmación', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await renderList('tool', pinIds.map(pin))

    fireEvent.click(
      screen.getByRole('button', { name: 'Borrar todos los pines (3)' }),
    )

    expect(listPins).not.toHaveBeenCalled()
    expect(deletePin).not.toHaveBeenCalled()
  })

  it('no aparece si el contenido no tiene pines', async () => {
    await renderList('tool', [])

    expect(screen.queryByRole('button', { name: /Borrar todos/ })).toBeNull()
  })
})

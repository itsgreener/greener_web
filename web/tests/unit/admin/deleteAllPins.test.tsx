// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const refreshRouter = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => refreshRouter() }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/PinMediaManager', () => ({
  default: () => null,
}))

vi.mock('@/modules/pin/container', () => ({
  attachPinImage: vi.fn(),
  attachPinVideo: vi.fn(),
  createPin: vi.fn(),
  createPinWithImage: vi.fn(),
  createPinWithVideo: vi.fn(),
  deleteAllPins: vi.fn(),
  deletePin: vi.fn(),
  detachPinMedia: vi.fn(),
  updatePin: vi.fn(),
}))

import { resetEditorLockForTests } from '@/app/admin/(panel)/contents/[id]/edit/editorLock'
import { deleteAllPinsAction } from '@/app/admin/(panel)/contents/[id]/edit/pinActions'
import { deleteAllPins } from '@/modules/pin/container'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'
const pinIds = [
  '22222222-2222-4222-8222-222222222221',
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222223',
]

type Outcome = Awaited<ReturnType<typeof deleteAllPins>>

const outcome = (over: Partial<Outcome> = {}): Outcome => ({
  total: 3,
  deleted: 3,
  stopped: false,
  purge: { purged: 3, failed: 0 },
  ...over,
})

beforeEach(() => {
  // Tras un borrado correcto el cerrojo se queda tomado hasta la recarga de
  // la página; entre tests hay que reiniciarlo.
  resetEditorLockForTests()
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(deleteAllPins).mockResolvedValue(outcome())
})

// El orden leer → borrar → purgar de cada pin vive en el caso de uso
// `makeDeleteAllPins` (tests/unit/pin/applicationLayer.test.ts).
describe('deleteAllPinsAction', () => {
  it('borra todos los pines del contenido con el caso de uso', async () => {
    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result).toEqual({ success: true })
    expect(deleteAllPins).toHaveBeenCalledExactlyOnceWith(CONTENT_ID)
  })

  it('si un borrado falla se detiene y dice cuántos se borraron', async () => {
    vi.mocked(deleteAllPins).mockResolvedValue(
      outcome({ deleted: 1, stopped: true }),
    )

    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result.success).toBeUndefined()
    expect(result.formError).toContain('Se han borrado 1 de 3 pines')
  })

  it('avisa si Cloudinary no pudo borrar algún archivo, dando los pines por borrados', async () => {
    vi.mocked(deleteAllPins).mockResolvedValue(
      outcome({ purge: { purged: 1, failed: 2 } }),
    )

    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result.success).toBe(true)
    expect(result.warning).toContain('2 archivo(s)')
  })

  it('un contenido sin pines no borra nada', async () => {
    vi.mocked(deleteAllPins).mockResolvedValue(
      outcome({ total: 0, deleted: 0 }),
    )

    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result.formError).toBe('Este contenido no tiene pines que borrar.')
  })

  it('rechaza un identificador de contenido que no es uuid', async () => {
    const result = await deleteAllPinsAction('no-uuid')

    expect(result.formError).toBe(
      'El identificador del contenido no es válido.',
    )
    expect(deleteAllPins).not.toHaveBeenCalled()
  })

  it('si no se pueden leer los pines, no borra nada', async () => {
    vi.mocked(deleteAllPins).mockRejectedValue(new Error('boom'))

    const result = await deleteAllPinsAction(CONTENT_ID)

    expect(result.formError).toBe(
      'No se han podido leer los pines del contenido.',
    )
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
      media: null,
    }
  }

  async function renderList(
    contentType: string,
    pins: ReturnType<typeof pin>[],
  ) {
    const { default: PinList } =
      await import('@/app/admin/(panel)/contents/[id]/edit/PinList')

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

      await waitFor(() => expect(deleteAllPins).toHaveBeenCalledTimes(1))
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

    expect(deleteAllPins).not.toHaveBeenCalled()
  })

  it('no aparece si el contenido no tiene pines', async () => {
    await renderList('tool', [])

    expect(screen.queryByRole('button', { name: /Borrar todos/ })).toBeNull()
  })
})

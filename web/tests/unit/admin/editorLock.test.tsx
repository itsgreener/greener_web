// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

/**
 * 8 oct: «Quitar todas las diapositivas» y, antes de que acabara, «Borrar
 * todos los pines» (o al revés) dejaban la pantalla con pines ya borrados en
 * la base de datos: la primera en terminar recargaba la página mientras la
 * otra seguía en marcha. El cerrojo compartido las serializa.
 */

const removeAllCarousel = vi.fn()
const deleteAllPins = vi.fn()
const deletePin = vi.fn()

vi.mock('@/app/admin/contents/[id]/edit/caseCarouselActions', () => ({
  addCaseCarouselVideoAction: vi.fn(),
  addCaseCarouselImageAction: vi.fn(),
  removeCaseCarouselMediaAction: vi.fn(),
  removeAllCaseCarouselMediaAction: (...a: unknown[]) =>
    removeAllCarousel(...a),
}))

vi.mock('@/app/admin/contents/[id]/edit/pinActions', () => ({
  createPinAction: vi.fn(),
  updatePinAction: vi.fn(),
  deletePinAction: (...a: unknown[]) => deletePin(...a),
  deleteAllPinsAction: (...a: unknown[]) => deleteAllPins(...a),
}))

vi.mock('@/app/admin/contents/[id]/edit/PinMediaManager', () => ({
  default: () => null,
}))

import CaseCarouselManager from '@/app/admin/contents/[id]/edit/CaseCarouselManager'
import PinList from '@/app/admin/contents/[id]/edit/PinList'
import {
  acquireEditorLock,
  resetEditorLockForTests,
  useEditorBusy,
} from '@/app/admin/contents/[id]/edit/editorLock'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

const ITEMS = [
  {
    mediaId: 'm1',
    kind: 'image' as const,
    cloudinaryPublicId: 'greener/content/a',
    sortOrder: 0,
    alt: 'a',
  },
]

const PINS = [
  { id: 'p1', label: 'Pin 1', ratio: '4:5', media: [] },
] as unknown as React.ComponentProps<typeof PinList>['pins']

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function Probe() {
  return <p>{useEditorBusy() ? 'busy' : 'free'}</p>
}

beforeEach(() => {
  vi.clearAllMocks()
  resetEditorLockForTests()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  // jsdom no implementa la recarga: se sustituye para observarla.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: vi.fn() },
  })
})

afterEach(() => {
  resetEditorLockForTests()
  vi.restoreAllMocks()
})

describe('editorLock', () => {
  it('ocupado mientras alguien lo tiene y libre al soltarlo (idempotente)', () => {
    render(<Probe />)

    expect(screen.getByText('free')).toBeInTheDocument()

    let release!: () => void
    act(() => {
      release = acquireEditorLock()
    })
    expect(screen.getByText('busy')).toBeInTheDocument()

    act(() => {
      release()
      release()
    })
    expect(screen.getByText('free')).toBeInTheDocument()
  })

  it('dos tomas: sigue ocupado hasta que se sueltan las dos', () => {
    render(<Probe />)

    let a!: () => void
    let b!: () => void
    act(() => {
      a = acquireEditorLock()
      b = acquireEditorLock()
    })
    act(() => a())
    expect(screen.getByText('busy')).toBeInTheDocument()
    act(() => b())
    expect(screen.getByText('free')).toBeInTheDocument()
  })
})

describe('borrados simultáneos en el editor', () => {
  function renderBoth() {
    render(
      <>
        <CaseCarouselManager contentId={CONTENT_ID} items={ITEMS} />
        <PinList contentId={CONTENT_ID} contentType="case" pins={PINS} />
      </>,
    )
  }

  it('con «Quitar todas» en marcha, los botones de borrar pines están deshabilitados', async () => {
    const pending = deferred<{ ok: true }>()
    removeAllCarousel.mockReturnValueOnce(pending.promise)

    renderBoth()

    fireEvent.click(
      screen.getByRole('button', { name: /Quitar todas las diapositivas/ }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Borrar todos los pines/ }),
      ).toBeDisabled(),
    )
    expect(screen.getByRole('button', { name: 'Borrar pin' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeDisabled()

    // Un clic sobre un botón deshabilitado no lanza la segunda operación.
    fireEvent.click(
      screen.getByRole('button', { name: /Borrar todos los pines/ }),
    )
    expect(deleteAllPins).not.toHaveBeenCalled()

    await act(async () => pending.resolve({ ok: true }))
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })

  it('con «Borrar todos los pines» en marcha, los del carrusel están deshabilitados (al revés)', async () => {
    const pending = deferred<{ success: true }>()
    deleteAllPins.mockReturnValueOnce(pending.promise)

    renderBoth()

    fireEvent.click(
      screen.getByRole('button', { name: /Borrar todos los pines/ }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Quitar todas las diapositivas/ }),
      ).toBeDisabled(),
    )
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeDisabled()

    await act(async () => pending.resolve({ success: true }))
  })

  it('si la operación falla, se libera el cerrojo y se puede volver a intentar', async () => {
    removeAllCarousel.mockResolvedValueOnce({ ok: false, error: 'Falló' })

    renderBoth()

    fireEvent.click(
      screen.getByRole('button', { name: /Quitar todas las diapositivas/ }),
    )

    expect(await screen.findByText('Falló')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Borrar todos los pines/ }),
    ).toBeEnabled()
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('si la acción lanza (red caída), tampoco se queda bloqueado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    deleteAllPins.mockRejectedValueOnce(new Error('network'))

    renderBoth()

    fireEvent.click(
      screen.getByRole('button', { name: /Borrar todos los pines/ }),
    )

    expect(
      await screen.findByText('No se ha podido completar la operación.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Quitar todas las diapositivas/ }),
    ).toBeEnabled()
  })
})

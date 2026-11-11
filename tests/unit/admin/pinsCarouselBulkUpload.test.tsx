// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Carga masiva con «formar un carrusel con los pines» (§2.150): ratio único,
 * orden natural por nombre, columna «#» y activación del carrusel ANTES de
 * subir el primer archivo.
 */

const getSignedImageUpload = vi.fn()
const uploadImageToCloudinary = vi.fn()
const createPinWithImageAction = vi.fn()
const setPinsCarouselAction = vi.fn()

vi.mock('@/modules/media/client/cloudinaryUpload', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/media/client/cloudinaryUpload')
  >('@/modules/media/client/cloudinaryUpload')

  return {
    ...actual,
    getSignedImageUpload: () => getSignedImageUpload(),
    uploadImageToCloudinary: (...args: unknown[]) =>
      uploadImageToCloudinary(...args),
  }
})

vi.mock('@/app/admin/(panel)/contents/[id]/edit/pinActions', () => ({
  createPinWithImageAction: (...args: unknown[]) =>
    createPinWithImageAction(...args),
  createPinWithVideoAction: vi.fn(),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/episodeActions', () => ({
  setPinsCarouselAction: (...args: unknown[]) => setPinsCarouselAction(...args),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/discardUpload', () => ({
  discardUploadQuietly: vi.fn(),
}))

import BulkPinUpload from '@/app/admin/(panel)/contents/[id]/edit/BulkPinUpload'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'

const SIGNED = {
  timestamp: 1,
  signature: 's',
  folder: 'f',
  apiKey: 'k',
  cloudName: 'demo',
}

function image(name: string) {
  return new File(['x'.repeat(1024)], name, { type: 'image/webp' })
}

type Carousel = {
  enabled: boolean
  lockedRatio: string | null
  ratiosMixed: boolean
}

function renderBulk(
  carousel: Carousel | null = {
    enabled: false,
    lockedRatio: null,
    ratiosMixed: false,
  },
  availableSlots = 8,
  contentType: 'episode' | 'tool' = 'episode',
) {
  render(
    <BulkPinUpload
      contentId={CONTENT_ID}
      contentType={contentType}
      availableSlots={availableSlots}
      fixedLanguage={contentType === 'episode' ? 'es' : null}
      carousel={carousel}
    />,
  )
}

function selectFiles(files: File[]) {
  fireEvent.change(document.getElementById('bulk-files')!, {
    target: { files },
  })
}

const checkbox = () =>
  screen.getByRole('checkbox', { name: 'Formar un carrusel con los pines' })

beforeEach(() => {
  vi.clearAllMocks()
  getSignedImageUpload.mockResolvedValue(SIGNED)
  uploadImageToCloudinary.mockResolvedValue({
    public_id: 'greener/content/foto',
    format: 'webp',
    width: 800,
    height: 1000,
    bytes: 1024,
  })
  createPinWithImageAction.mockResolvedValue({
    ok: true,
    pinId: 'p',
    mediaId: 'm',
  })
  setPinsCarouselAction.mockResolvedValue({ ok: true, enabled: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BulkPinUpload — carrusel de pines (§2.150)', () => {
  it('fuera de un episodio no hay casilla', () => {
    renderBulk(null, 8, 'tool')

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('sin marcar todo sigue igual: columna de ratio por fila y sin «#»', () => {
    renderBulk()
    selectFiles([image('a.webp')])

    expect(screen.getByRole('columnheader', { name: 'Ratio' })).toBeVisible()
    expect(
      screen.queryByRole('columnheader', { name: '#' }),
    ).not.toBeInTheDocument()
  })

  it('al marcarla desaparece el ratio por fila, sale «#» y el selector común pasa a ser el del carrusel', () => {
    renderBulk()
    selectFiles([image('a.webp')])
    fireEvent.click(checkbox())

    expect(
      screen.queryByRole('columnheader', { name: 'Ratio' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '#' })).toBeVisible()
    expect(screen.getByLabelText('Ratio del carrusel')).toBeEnabled()
  })

  it('ordena las filas por nombre en orden natural (2 antes que 10)', () => {
    renderBulk()
    selectFiles([image('10.webp'), image('2.webp'), image('1.webp')])
    fireEvent.click(checkbox())

    const names = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.querySelectorAll('td')[1]?.textContent)

    expect(names).toEqual(['1.webp', '2.webp', '10.webp'])
  })

  it('ignora el ratio del nombre del archivo y avisa', () => {
    renderBulk()
    selectFiles([image('a-9x16-pin.webp'), image('b-4x5-pin.webp')])
    fireEvent.change(screen.getByLabelText('Ratio por defecto'), {
      target: { value: '4:5' },
    })
    fireEvent.click(checkbox())

    expect(
      screen.getByText(/1 archivo traía un ratio distinto|Un archivo traía/),
    ).toBeVisible()
  })

  it('activa el carrusel ANTES de subir y todos los pines salen con el ratio único', async () => {
    const calls: string[] = []

    setPinsCarouselAction.mockImplementation(async () => {
      calls.push('activar')

      return { ok: true, enabled: true }
    })
    createPinWithImageAction.mockImplementation(async () => {
      calls.push('crear')

      return { ok: true, pinId: 'p', mediaId: 'm' }
    })

    renderBulk()
    selectFiles([image('b.webp'), image('a.webp')])
    fireEvent.change(screen.getByLabelText('Ratio por defecto'), {
      target: { value: '9:16' },
    })
    fireEvent.click(checkbox())
    fireEvent.click(screen.getByRole('button', { name: 'Subir 2 pines' }))

    await waitFor(() =>
      expect(createPinWithImageAction).toHaveBeenCalledTimes(2),
    )

    expect(setPinsCarouselAction).toHaveBeenCalledWith(CONTENT_ID, true)
    expect(calls).toEqual(['activar', 'crear', 'crear'])
    // Mismo ratio en todas y en el orden de los nombres.
    expect(
      createPinWithImageAction.mock.calls.map(([arg]) => arg.ratio),
    ).toEqual(['9:16', '9:16'])
    expect(createPinWithImageAction.mock.calls.map(([arg]) => arg.alt)).toEqual(
      ['a', 'b'],
    )
  })

  it('si no se puede activar no sube nada y enseña el motivo', async () => {
    setPinsCarouselAction.mockResolvedValue({
      ok: false,
      error: 'Todos los pines de un carrusel deben tener el mismo ratio.',
    })

    renderBulk()
    selectFiles([image('a.webp')])
    fireEvent.click(checkbox())
    fireEvent.click(screen.getByRole('button', { name: 'Subir 1 pines' }))

    expect(await screen.findByText(/mismo ratio/)).toBeVisible()
    expect(getSignedImageUpload).not.toHaveBeenCalled()
    expect(createPinWithImageAction).not.toHaveBeenCalled()
  })

  it('sin marcar la casilla no toca el carrusel', async () => {
    renderBulk()
    selectFiles([image('a.webp')])
    fireEvent.click(screen.getByRole('button', { name: 'Subir 1 pines' }))

    await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalled())

    expect(setPinsCarouselAction).not.toHaveBeenCalled()
  })

  it('con el carrusel ya activo la casilla sale marcada y bloqueada, con el ratio de los pines existentes y sin reactivarlo', async () => {
    renderBulk({ enabled: true, lockedRatio: '4:5', ratiosMixed: false }, 5)
    selectFiles([image('a.webp')])

    expect(checkbox()).toBeChecked()
    expect(checkbox()).toBeDisabled()
    expect(screen.getByLabelText('Ratio del carrusel')).toHaveValue('4:5')
    expect(screen.getByLabelText('Ratio del carrusel')).toBeDisabled()
    // Posición: tras los 3 pines que ya hay (8 - 5 huecos libres).
    expect(
      screen.getAllByRole('row')[1].querySelectorAll('td')[0],
    ).toHaveTextContent('4')

    fireEvent.click(screen.getByRole('button', { name: 'Subir 1 pines' }))

    await waitFor(() =>
      expect(createPinWithImageAction).toHaveBeenCalledWith(
        expect.objectContaining({ ratio: '4:5' }),
      ),
    )
    expect(setPinsCarouselAction).not.toHaveBeenCalled()
  })

  it('con ratios distintos entre los pines actuales no se puede marcar', () => {
    renderBulk({ enabled: false, lockedRatio: null, ratiosMixed: true })

    expect(checkbox()).toBeDisabled()
    expect(screen.getByText(/ratios distintos/)).toBeVisible()
  })
})

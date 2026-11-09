// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const refreshRouter = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => refreshRouter() }),
}))

/**
 * Flujo de imagen del gestor de medios de un pin, que desde la auditoría TSX
 * (ADM-C1/B1) usa `MediaUploader` y `useMediaUpload`. Los vídeos los cubre
 * `pinMediaManager`. El carrusel de un caso ya no sube de uno en uno: su
 * carga en lote se prueba en `caseCarouselBulkUpload`.
 */

const getSignedImageUpload = vi.fn()
const uploadImageToCloudinary = vi.fn()
const attachPinImageAction = vi.fn()
const discardUploadQuietly = vi.fn()

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

// jsdom no decodifica imágenes: la validación del archivo se da por buena.
vi.mock('@/modules/media/client/validateImageSelection', () => ({
  IMAGE_FILE_ACCEPT: 'image/jpeg,image/png,image/webp,image/avif',
  validateImageSelection: () => Promise.resolve(null),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/pinActions', () => ({
  attachPinImageAction: (...args: unknown[]) => attachPinImageAction(...args),
  attachPinVideoAction: vi.fn(),
  detachPinMediaAction: vi.fn(),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/discardUpload', () => ({
  discardUploadQuietly: (...args: unknown[]) => discardUploadQuietly(...args),
}))

import { resetEditorLockForTests } from '@/app/admin/(panel)/contents/[id]/edit/editorLock'
import PinMediaManager from '@/app/admin/(panel)/contents/[id]/edit/PinMediaManager'

const IMAGE = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })

function uploadedImage() {
  return {
    public_id: 'greener/content/images/foto',
    format: 'jpg',
    width: 1200,
    height: 800,
    bytes: 120_000,
  }
}

function chooseFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement

  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  resetEditorLockForTests()
  vi.clearAllMocks()
  getSignedImageUpload.mockResolvedValue({
    timestamp: 1,
    signature: 's',
    folder: 'f',
    apiKey: 'k',
    cloudName: 'demo',
  })
  uploadImageToCloudinary.mockResolvedValue(uploadedImage())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PinMediaManager — subida de una imagen', () => {
  it('registra la imagen en el pin y refresca', async () => {
    attachPinImageAction.mockResolvedValue({ ok: true })

    render(
      <PinMediaManager
        pinId="pin-1"
        contentType="case"
        pinRatio="1:1"
        media={null}
      />,
    )

    chooseFile(IMAGE)
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }))

    await waitFor(() =>
      expect(attachPinImageAction).toHaveBeenCalledWith({
        pinId: 'pin-1',
        cloudinaryPublicId: 'greener/content/images/foto',
        format: 'jpg',
        width: 1200,
        height: 800,
        bytes: 120_000,
      }),
    )
    await waitFor(() => expect(refreshRouter).toHaveBeenCalledTimes(1))
  })

  it('el botón no se activa hasta elegir un archivo', () => {
    render(
      <PinMediaManager
        pinId="pin-1"
        contentType="case"
        pinRatio="1:1"
        media={null}
      />,
    )

    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled()

    chooseFile(IMAGE)

    expect(screen.getByRole('button', { name: 'Subir' })).toBeEnabled()
  })

  it('cambiar de tipo vacía el archivo elegido y ofrece el límite de vídeo del tipo de contenido', () => {
    render(
      <PinMediaManager
        pinId="pin-1"
        contentType="tool"
        pinRatio="1:1"
        media={null}
      />,
    )

    chooseFile(IMAGE)
    fireEvent.change(screen.getByLabelText('Tipo de archivo'), {
      target: { value: 'video' },
    })

    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled()
    expect(
      screen.getByRole('option', { name: 'Vídeo (máx. 15 s)' }),
    ).toBeInTheDocument()
  })

  it('con medio ya subido no ofrece subir otro', () => {
    render(
      <PinMediaManager
        pinId="pin-1"
        contentType="case"
        pinRatio="1:1"
        media={{ id: 'm-1', kind: 'image', cloudinaryPublicId: 'x' }}
      />,
    )

    expect(
      screen.getByText('Este pin ya tiene su medio. Quítalo para subir otro.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Tipo de archivo')).not.toBeInTheDocument()
  })
})

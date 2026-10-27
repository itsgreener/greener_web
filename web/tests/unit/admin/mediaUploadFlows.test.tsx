// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const refreshRouter = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => refreshRouter() }),
}))

/**
 * Flujos de imagen y comprobaciones previas de los dos gestores de medios del
 * editor, que desde la auditoría TSX (ADM-C1/B1) comparten `MediaUploader` y
 * `useMediaUpload`. Los vídeos ya los cubren `pinMediaManager` y
 * `caseCarouselManager`; aquí se fija lo que quedaba sin test: el alt
 * obligatorio del carrusel, el registro de una imagen, el vaciado del
 * formulario tras subir y el descarte si el registro falla.
 */

const getSignedImageUpload = vi.fn()
const uploadImageToCloudinary = vi.fn()
const addCaseCarouselImageAction = vi.fn()
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

vi.mock('@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions', () => ({
  addCaseCarouselImageAction: (...args: unknown[]) =>
    addCaseCarouselImageAction(...args),
  addCaseCarouselVideoAction: vi.fn(),
  removeCaseCarouselMediaAction: vi.fn(),
  removeAllCaseCarouselMediaAction: vi.fn(),
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
import CaseCarouselManager from '@/app/admin/(panel)/contents/[id]/edit/CaseCarouselManager'
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

describe('CaseCarouselManager — subida de una imagen', () => {
  it('sin alt no sube nada y lo explica', async () => {
    render(<CaseCarouselManager contentId="content-1" items={[]} />)

    chooseFile(IMAGE)
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al carrusel' }))

    expect(
      await screen.findByText(
        'El alt es obligatorio antes de subir la imagen.',
      ),
    ).toBeInTheDocument()
    expect(uploadImageToCloudinary).not.toHaveBeenCalled()
  })

  it('con el vídeo elegido, el mensaje habla del vídeo', async () => {
    render(<CaseCarouselManager contentId="content-1" items={[]} />)

    fireEvent.change(screen.getByLabelText('Tipo de archivo'), {
      target: { value: 'video' },
    })
    chooseFile(new File(['x'], 'clip.mp4', { type: 'video/mp4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al carrusel' }))

    expect(
      await screen.findByText('El alt es obligatorio antes de subir el vídeo.'),
    ).toBeInTheDocument()
    expect(uploadImageToCloudinary).not.toHaveBeenCalled()
  })

  it('registra la imagen con el alt recortado y el orden al final, vacía el alt y refresca', async () => {
    addCaseCarouselImageAction.mockResolvedValue({ ok: true })

    render(
      <CaseCarouselManager
        contentId="content-1"
        items={[
          {
            mediaId: 'm-1',
            kind: 'image',
            cloudinaryPublicId: 'a',
            sortOrder: 0,
            alt: 'Uno',
          },
          {
            mediaId: 'm-2',
            kind: 'image',
            cloudinaryPublicId: 'b',
            sortOrder: 1,
            alt: 'Dos',
          },
        ]}
      />,
    )

    fireEvent.change(screen.getByLabelText('Alt (obligatorio)'), {
      target: { value: '  Fachada del edificio  ' },
    })
    chooseFile(IMAGE)
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al carrusel' }))

    await waitFor(() =>
      expect(addCaseCarouselImageAction).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: 'content-1',
          cloudinaryPublicId: 'greener/content/images/foto',
          sortOrder: 2,
          alt: 'Fachada del edificio',
        }),
      ),
    )

    await waitFor(() => expect(refreshRouter).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText('Alt (obligatorio)')).toHaveValue('')
    expect(discardUploadQuietly).not.toHaveBeenCalled()
  })

  it('si el registro falla, enseña el error y descarta el archivo subido', async () => {
    addCaseCarouselImageAction.mockResolvedValue({
      ok: false,
      error: 'No se ha podido guardar la diapositiva.',
    })

    render(<CaseCarouselManager contentId="content-1" items={[]} />)

    fireEvent.change(screen.getByLabelText('Alt (obligatorio)'), {
      target: { value: 'Alt' },
    })
    chooseFile(IMAGE)
    fireEvent.click(screen.getByRole('button', { name: 'Añadir al carrusel' }))

    expect(
      await screen.findByText('No se ha podido guardar la diapositiva.'),
    ).toBeInTheDocument()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/content/images/foto',
      kind: 'image',
    })
    expect(refreshRouter).not.toHaveBeenCalled()
  })
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

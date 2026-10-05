// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Carga masiva de pines con vídeo (5 oct 2026). Antes el `<input>` solo
 * aceptaba `image/*` y todo el flujo era de imágenes: no se podía cargar
 * ningún vídeo. Ahora un lote puede mezclar imágenes y vídeos
 * (MP4, WebM y MOV).
 */

const getSignedImageUpload = vi.fn()
const uploadImageToCloudinary = vi.fn()
const getSignedVideoUpload = vi.fn()
const uploadVideoToCloudinary = vi.fn()
const createPinWithImageAction = vi.fn()
const createPinWithVideoAction = vi.fn()
const discardUploadQuietly = vi.fn()
const readLocalVideoDuration = vi.fn()

vi.mock('@/modules/media/infrastructure/cloudinaryUpload', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/media/infrastructure/cloudinaryUpload')
  >('@/modules/media/infrastructure/cloudinaryUpload')

  return {
    ...actual,
    getSignedImageUpload: () => getSignedImageUpload(),
    uploadImageToCloudinary: (...args: unknown[]) =>
      uploadImageToCloudinary(...args),
    getSignedVideoUpload: () => getSignedVideoUpload(),
    uploadVideoToCloudinary: (...args: unknown[]) =>
      uploadVideoToCloudinary(...args),
  }
})

vi.mock('@/modules/media/infrastructure/readLocalVideoDuration', () => ({
  readLocalVideoDuration: (...args: unknown[]) =>
    readLocalVideoDuration(...args),
}))

vi.mock('@/app/admin/contents/[id]/edit/pinActions', () => ({
  createPinWithImageAction: (...args: unknown[]) =>
    createPinWithImageAction(...args),
  createPinWithVideoAction: (...args: unknown[]) =>
    createPinWithVideoAction(...args),
}))

vi.mock('@/app/admin/contents/[id]/edit/discardUpload', () => ({
  discardUploadQuietly: (...args: unknown[]) => discardUploadQuietly(...args),
}))

import BulkPinUpload from '@/app/admin/contents/[id]/edit/BulkPinUpload'

const SIGNED = {
  timestamp: 1,
  signature: 's',
  folder: 'f',
  apiKey: 'k',
  cloudName: 'demo',
}

function uploadedVideo(overrides: Record<string, unknown> = {}) {
  return {
    public_id: 'greener/content/videos/demo',
    format: 'mp4',
    width: 1080,
    height: 1080,
    duration: 5,
    bytes: 1024 * 1024,
    ...overrides,
  }
}

function video(name = 'demo.mp4', type = 'video/mp4') {
  return new File(['x'.repeat(1024)], name, { type })
}

function image(name = 'foto.webp') {
  return new File(['x'.repeat(1024)], name, { type: 'image/webp' })
}

function renderBulk(
  contentType: 'tool' | 'case' | 'insight' | 'episode' | 'other' = 'tool',
) {
  render(
    <BulkPinUpload
      contentId="11111111-1111-4111-8111-111111111111"
      contentType={contentType as never}
    />,
  )
}

function selectFiles(files: File[]) {
  const input = document.getElementById('bulk-files') as HTMLInputElement

  fireEvent.change(input, { target: { files } })
}

function clickUpload(count: number) {
  fireEvent.click(screen.getByRole('button', { name: `Subir ${count} pines` }))
}

beforeEach(() => {
  vi.clearAllMocks()
  getSignedImageUpload.mockResolvedValue(SIGNED)
  getSignedVideoUpload.mockResolvedValue(SIGNED)
  uploadImageToCloudinary.mockResolvedValue({
    public_id: 'greener/content/foto',
    format: 'webp',
    width: 800,
    height: 800,
    bytes: 1024,
  })
  uploadVideoToCloudinary.mockResolvedValue(uploadedVideo())
  readLocalVideoDuration.mockResolvedValue(5)
  createPinWithImageAction.mockResolvedValue({
    ok: true,
    pinId: 'p',
    mediaId: 'm',
  })
  createPinWithVideoAction.mockResolvedValue({
    ok: true,
    pinId: 'p',
    mediaId: 'm',
  })
  discardUploadQuietly.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BulkPinUpload — vídeos en la carga masiva (5 oct 2026)', () => {
  it('REGRESIÓN: el selector de archivos acepta vídeo (antes solo image/*)', () => {
    renderBulk()

    const accept = document
      .getElementById('bulk-files')!
      .getAttribute('accept')!

    expect(accept).toContain('image/*')
    expect(accept).toContain('video/*')
    // Respaldo por extensión para los .mov que el sistema no etiqueta como vídeo.
    expect(accept).toContain('.mov')
    expect(accept).toContain('.mp4')
    expect(accept).toContain('.webm')
  })

  it.each([
    ['demo.mp4', 'video/mp4'],
    ['demo.webm', 'video/webm'],
    ['demo.mov', 'video/quicktime'],
    ['demo.mov', ''], // sin MIME: se reconoce por la extensión
  ])(
    'un %s (%s) se reconoce como vídeo y se sube por el camino de vídeo',
    async (name, type) => {
      renderBulk()
      selectFiles([video(name, type)])

      clickUpload(1)

      await waitFor(() =>
        expect(createPinWithVideoAction).toHaveBeenCalledOnce(),
      )

      expect(uploadVideoToCloudinary).toHaveBeenCalledOnce()
      expect(uploadImageToCloudinary).not.toHaveBeenCalled()
      expect(createPinWithImageAction).not.toHaveBeenCalled()
    },
  )

  it('un lote mixto: cada archivo va por su camino, y la reproducción en feed por defecto es «al entrar en pantalla»', async () => {
    renderBulk()
    selectFiles([image(), video()])

    clickUpload(2)

    await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalledOnce())
    await waitFor(() => expect(createPinWithVideoAction).toHaveBeenCalledOnce())

    expect(createPinWithImageAction).toHaveBeenCalledWith(
      expect.objectContaining({ autoplayMode: null }),
    )
    expect(createPinWithVideoAction).toHaveBeenCalledWith(
      expect.objectContaining({
        autoplayMode: 'viewport',
        durationSeconds: 5,
        cloudinaryPublicId: 'greener/content/videos/demo',
      }),
    )
  })

  it('el modo de reproducción del lote se puede cambiar a «al pasar el ratón»', async () => {
    renderBulk()
    selectFiles([video()])

    fireEvent.change(
      screen.getByLabelText('Reproducción de los vídeos en el feed'),
      {
        target: { value: 'hover' },
      },
    )
    clickUpload(1)

    await waitFor(() =>
      expect(createPinWithVideoAction).toHaveBeenCalledWith(
        expect.objectContaining({ autoplayMode: 'hover' }),
      ),
    )
  })

  it('en un pin que NO es de tool, un vídeo de 12 s se rechaza antes de subir (límite 8 s)', async () => {
    readLocalVideoDuration.mockResolvedValue(12)
    renderBulk('case')
    selectFiles([video()])

    clickUpload(1)

    expect(
      await screen.findByText(
        'Error: El vídeo no puede superar los 8 segundos.',
      ),
    ).toBeInTheDocument()
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled()
  })

  it('en una tool, 12 s se admiten (límite 15 s)', async () => {
    readLocalVideoDuration.mockResolvedValue(12)
    uploadVideoToCloudinary.mockResolvedValue(uploadedVideo({ duration: 12 }))
    renderBulk('tool')
    selectFiles([video()])

    clickUpload(1)

    await waitFor(() => expect(createPinWithVideoAction).toHaveBeenCalledOnce())
  })

  it('si el navegador no sabe la duración (WebM sin cabecera) se sube igualmente, y manda la de Cloudinary', async () => {
    readLocalVideoDuration.mockResolvedValue(null)
    uploadVideoToCloudinary.mockResolvedValue(uploadedVideo({ duration: 20 }))
    renderBulk('tool')
    selectFiles([video('grabacion.webm', 'video/webm')])

    clickUpload(1)

    expect(
      await screen.findByText(/dura más de los 15 segundos/),
    ).toBeInTheDocument()
    expect(createPinWithVideoAction).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/content/videos/demo',
      kind: 'video',
    })
  })

  it('un vídeo de más de 15 MB en una tool se rechaza antes de subir si no se conoce su duración', async () => {
    readLocalVideoDuration.mockResolvedValue(null)
    renderBulk('tool')

    const big = video('grande.webm', 'video/webm')
    Object.defineProperty(big, 'size', { value: 16 * 1024 * 1024 })
    selectFiles([big])

    clickUpload(1)

    expect(
      await screen.findByText('Error: El vídeo supera los 15 MB.'),
    ).toBeInTheDocument()
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled()
  })

  it('si el servidor rechaza el vídeo, la fila muestra el error y se descarta el archivo subido', async () => {
    createPinWithVideoAction.mockResolvedValue({
      ok: false,
      error:
        'El vídeo supera el peso máximo de un pin (100 MB; 15 MB en las tools).',
    })
    renderBulk('tool')
    selectFiles([video()])

    clickUpload(1)

    expect(
      await screen.findByText(/Error: El vídeo supera el peso máximo/),
    ).toBeInTheDocument()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/content/videos/demo',
      kind: 'video',
    })
  })

  it('avisa (sin bloquear) si el ratio real del vídeo no es el del pin', async () => {
    uploadVideoToCloudinary.mockResolvedValue(
      uploadedVideo({ width: 1920, height: 1080 }),
    )
    renderBulk('tool') // ratio por defecto 1:1
    selectFiles([video()])

    clickUpload(1)

    expect(
      await screen.findByText(/Hecho\. Aviso: Su ratio real \(1920×1080/),
    ).toBeInTheDocument()
    expect(createPinWithVideoAction).toHaveBeenCalledOnce()
  })

  it('un vídeo con el ratio correcto no genera aviso', async () => {
    renderBulk('tool')
    selectFiles([video()])

    clickUpload(1)

    expect(await screen.findByText('Hecho')).toBeInTheDocument()
  })

  it('las imágenes siguen funcionando igual que antes', async () => {
    renderBulk('tool')
    selectFiles([image()])

    clickUpload(1)

    await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalledOnce())
    expect(createPinWithVideoAction).not.toHaveBeenCalled()
    expect(await screen.findByText('Hecho')).toBeInTheDocument()
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Subida de un vídeo a un pin (5 oct 2026). Caso real que motivó estos
 * tests: un vídeo de 5 s en un pin de tool se rechazaba con «supera los 15
 * segundos» porque el navegador respondía `duration = Infinity` (WebM sin
 * cabecera de duración) y `Infinity > 15`.
 */

const getSignedVideoUpload = vi.fn()
const uploadVideoToCloudinary = vi.fn()
const attachPinVideoAction = vi.fn()
const discardUploadQuietly = vi.fn()

vi.mock('@/modules/media/infrastructure/cloudinaryUpload', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/media/infrastructure/cloudinaryUpload')
  >('@/modules/media/infrastructure/cloudinaryUpload')

  return {
    ...actual,
    getSignedVideoUpload: () => getSignedVideoUpload(),
    uploadVideoToCloudinary: (...args: unknown[]) =>
      uploadVideoToCloudinary(...args),
  }
})

vi.mock('@/app/admin/contents/[id]/edit/pinActions', () => ({
  attachPinImageAction: vi.fn(),
  attachPinVideoAction: (...args: unknown[]) => attachPinVideoAction(...args),
  detachPinMediaAction: vi.fn(),
}))

vi.mock('@/app/admin/contents/[id]/edit/discardUpload', () => ({
  discardUploadQuietly: (...args: unknown[]) => discardUploadQuietly(...args),
}))

import PinMediaManager from '@/app/admin/contents/[id]/edit/PinMediaManager'

// jsdom no decodifica vídeo: se sustituye createElement solo para 'video'.
function mockVideoElement(duration: number) {
  const realCreateElement = document.createElement.bind(document)

  vi.spyOn(document, 'createElement').mockImplementation(
    (tagName: string, ...rest: unknown[]) => {
      if (tagName !== 'video') {
        // @ts-expect-error -- passthrough al original para cualquier otro tag
        return realCreateElement(tagName, ...rest)
      }

      const el = {
        preload: '',
        duration,
        set src(_value: string) {
          queueMicrotask(() =>
            el.onloadedmetadata?.(new Event('loadedmetadata')),
          )
        },
        onloadedmetadata: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      }

      return el as unknown as HTMLVideoElement
    },
  )
}

function uploadedVideo(overrides: Record<string, unknown> = {}) {
  return {
    public_id: 'greener/content/videos/demo',
    format: 'webm',
    width: 1920,
    height: 1080,
    duration: 5,
    bytes: 1024 * 1024,
    ...overrides,
  }
}

function selectAndUpload(file: File) {
  fireEvent.change(screen.getByLabelText('Tipo de archivo'), {
    target: { value: 'video' },
  })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.click(screen.getByRole('button', { name: 'Subir' }))
}

const FILE = new File(['x'.repeat(1024)], 'demo.webm', { type: 'video/webm' })

function renderManager(contentType: string, pinRatio = '16:9') {
  render(
    <PinMediaManager
      pinId="22222222-2222-4222-8222-222222222222"
      contentType={contentType}
      pinRatio={pinRatio}
      media={[]}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
  getSignedVideoUpload.mockResolvedValue({
    timestamp: 1,
    signature: 's',
    folder: 'f',
    apiKey: 'k',
    cloudName: 'demo',
  })
  uploadVideoToCloudinary.mockResolvedValue(uploadedVideo())
  attachPinVideoAction.mockResolvedValue({ ok: true, mediaId: 'm1' })
  discardUploadQuietly.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PinMediaManager — subida de vídeo (5 oct 2026)', () => {
  it.each([Infinity, Number.NaN])(
    'REGRESIÓN: pin de tool, vídeo de 5 s cuyo navegador responde duration=%s → se sube y se adjunta, sin «supera los 15 segundos»',
    async (reported) => {
      mockVideoElement(reported)
      renderManager('tool')

      selectAndUpload(FILE)

      await waitFor(() =>
        expect(uploadVideoToCloudinary).toHaveBeenCalledOnce(),
      )
      await waitFor(() =>
        expect(attachPinVideoAction).toHaveBeenCalledWith(
          expect.objectContaining({ durationSeconds: 5 }),
        ),
      )
      expect(screen.queryByText(/segundos/)).not.toBeInTheDocument()
    },
  )

  it('pin de tool: un vídeo de 12 s se admite (el límite de las tools es 15 s)', async () => {
    mockVideoElement(12)
    uploadVideoToCloudinary.mockResolvedValue(uploadedVideo({ duration: 12 }))
    renderManager('tool')

    selectAndUpload(FILE)

    await waitFor(() => expect(attachPinVideoAction).toHaveBeenCalledOnce())
  })

  it('pin que NO es de tool: 12 s se rechaza ANTES de subir (el límite es 8 s)', async () => {
    mockVideoElement(12)
    renderManager('case')

    selectAndUpload(FILE)

    expect(
      await screen.findByText('El vídeo no puede superar los 8 segundos.'),
    ).toBeInTheDocument()
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled()
  })

  it('pin de tool: un vídeo realmente de 20 s se rechaza con 15 s en el mensaje y el archivo subido se descarta', async () => {
    mockVideoElement(Infinity) // el navegador no lo sabe; lo dice Cloudinary
    uploadVideoToCloudinary.mockResolvedValue(uploadedVideo({ duration: 20 }))
    renderManager('tool')

    selectAndUpload(FILE)

    expect(
      await screen.findByText(/dura más de los 15 segundos/),
    ).toBeInTheDocument()
    expect(attachPinVideoAction).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/content/videos/demo',
      kind: 'video',
    })
  })

  it('pin de tool: un vídeo de más de 15 MB se rechaza antes de subirlo si el navegador no sabe su duración', async () => {
    mockVideoElement(Infinity)
    renderManager('tool')

    const big = new File(['x'], 'grande.webm', { type: 'video/webm' })
    Object.defineProperty(big, 'size', { value: 16 * 1024 * 1024 })

    selectAndUpload(big)

    expect(
      await screen.findByText('El vídeo supera los 15 MB.'),
    ).toBeInTheDocument()
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled()
  })

  it('avisa (sin bloquear) si el ratio real del vídeo no es el del pin', async () => {
    mockVideoElement(5)
    uploadVideoToCloudinary.mockResolvedValue(
      uploadedVideo({ width: 1080, height: 1920 }),
    )
    renderManager('tool', '16:9')

    selectAndUpload(FILE)

    expect(
      await screen.findByText(/no es el del pin \(16:9\)/),
    ).toBeInTheDocument()
    expect(attachPinVideoAction).toHaveBeenCalledOnce()
  })
})

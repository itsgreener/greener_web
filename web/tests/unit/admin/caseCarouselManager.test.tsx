// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Parche urgente del 30 sep: leer la duración de un vídeo en el propio
 * navegador (`<video>.onloadedmetadata`) falla con bastantes vídeos
 * válidos — sobre todo .mov/HEVC, grabados así por defecto en muchos
 * móviles — aunque Cloudinary los acepta sin problema. Antes, ese fallo
 * local bloqueaba la subida entera. Estos tests fijan que ya no lo hace:
 * se sube igualmente y se valida con la duración real de Cloudinary.
 */

const getSignedVideoUpload = vi.fn()
const uploadVideoToCloudinary = vi.fn()
const addCaseCarouselVideoAction = vi.fn()

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

vi.mock('@/app/admin/contents/[id]/edit/caseCarouselActions', () => ({
  addCaseCarouselVideoAction: (...args: unknown[]) =>
    addCaseCarouselVideoAction(...args),
  addCaseCarouselImageAction: vi.fn(),
  removeCaseCarouselMediaAction: vi.fn(),
}))

import CaseCarouselManager from '@/app/admin/contents/[id]/edit/CaseCarouselManager'

// jsdom no decodifica vídeo de verdad: ni onloadedmetadata ni onerror se
// disparan solos al asignar `.src`. Se sustituye document.createElement
// solo para 'video', de forma controlada por test.
function mockVideoElement(mode: 'fail' | 'succeed', duration = 10) {
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
          queueMicrotask(() => {
            if (mode === 'fail') {
              el.onerror?.(new Event('error'))
            } else {
              el.onloadedmetadata?.(new Event('loadedmetadata'))
            }
          })
        },
        onloadedmetadata: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      }

      return el as unknown as HTMLVideoElement
    },
  )
}

function selectAndUpload(file: File) {
  fireEvent.change(screen.getByLabelText('Tipo de archivo'), {
    target: { value: 'video' },
  })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.change(screen.getByLabelText('Alt (obligatorio)'), {
    target: { value: 'Texto alternativo de prueba' },
  })
  fireEvent.click(screen.getByRole('button', { name: /añadir al carrusel/i }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const SMALL_VIDEO_FILE = new File(['x'.repeat(1024)], 'clip.mov', {
  type: 'video/quicktime',
})

describe('CaseCarouselManager — subida de vídeo cuando el navegador no sabe leer la duración', () => {
  it('si el navegador no puede leer la duración (típico .mov/HEVC), la subida NO se bloquea: llega a Cloudinary igualmente', async () => {
    mockVideoElement('fail')
    getSignedVideoUpload.mockResolvedValue({
      timestamp: 1,
      signature: 's',
      folder: 'f',
      apiKey: 'k',
      cloudName: 'demo',
    })
    uploadVideoToCloudinary.mockResolvedValue({
      public_id: 'videos/clip',
      format: 'mov',
      width: 1920,
      height: 1080,
      duration: 70, // 1:10 — dentro del límite de 180s de carrusel
      bytes: 45 * 1024 * 1024,
    })
    addCaseCarouselVideoAction.mockResolvedValue({ ok: true })

    render(<CaseCarouselManager contentId="content-1" items={[]} />)
    selectAndUpload(SMALL_VIDEO_FILE)

    await waitFor(() => {
      expect(uploadVideoToCloudinary).toHaveBeenCalledOnce()
    })
    await waitFor(() => {
      expect(addCaseCarouselVideoAction).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: 'content-1',
          durationSeconds: 70,
        }),
      )
    })
    expect(
      screen.queryByText('No se ha podido leer la duración del vídeo.'),
    ).not.toBeInTheDocument()
  })

  it('si tras subir, la duración REAL de Cloudinary supera el límite, se rechaza sin guardar en el caso (no antes, por las buenas)', async () => {
    mockVideoElement('fail')
    getSignedVideoUpload.mockResolvedValue({
      timestamp: 1,
      signature: 's',
      folder: 'f',
      apiKey: 'k',
      cloudName: 'demo',
    })
    uploadVideoToCloudinary.mockResolvedValue({
      public_id: 'videos/clip',
      format: 'mov',
      width: 1920,
      height: 1080,
      duration: 240, // por encima de los 180s de VIDEO_LIMITS
      bytes: 45 * 1024 * 1024,
    })

    render(<CaseCarouselManager contentId="content-1" items={[]} />)
    selectAndUpload(SMALL_VIDEO_FILE)

    await waitFor(() => {
      expect(uploadVideoToCloudinary).toHaveBeenCalledOnce()
    })
    await waitFor(() => {
      expect(screen.getByText(/180 segundos/)).toBeInTheDocument()
    })
    expect(addCaseCarouselVideoAction).not.toHaveBeenCalled()
  })

  it('si el navegador SÍ puede leer la duración y es demasiado larga, se sigue rechazando antes de subir (sin cambios de comportamiento)', async () => {
    mockVideoElement('succeed', 240)

    render(<CaseCarouselManager contentId="content-1" items={[]} />)
    selectAndUpload(SMALL_VIDEO_FILE)

    await waitFor(() => {
      expect(screen.getByText(/180 segundos/)).toBeInTheDocument()
    })
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled()
  })
})

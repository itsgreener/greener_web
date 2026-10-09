// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Portada de un contenido `other`: el ratio se lee del nombre del archivo
 * (`[nombre]-[proporción]-[tipo].ext`) y, si no hay, se sugiere por las
 * dimensiones reales. Si el nombre y el archivo no encajan, se avisa antes
 * de subir.
 */

vi.mock('@/modules/media/infrastructure/cloudinaryUpload', () => ({
  getSignedImageUpload: vi.fn(),
  getSignedVideoUpload: vi.fn(),
  uploadImageToCloudinary: vi.fn(),
  uploadVideoToCloudinary: vi.fn(),
}))

vi.mock('@/modules/media/infrastructure/readLocalVideoDuration', () => ({
  readLocalVideoDuration: vi.fn(),
}))

vi.mock('@/app/admin/contents/[id]/edit/mediaActions', () => ({
  registerCoverImageAction: vi.fn(),
  registerCoverVideoAction: vi.fn(),
  deleteCoverMediaAction: vi.fn(),
}))

vi.mock('@/app/admin/contents/[id]/edit/discardUpload', () => ({
  discardUploadQuietly: vi.fn(),
}))

import CoverMediaUpload from '@/app/admin/contents/[id]/edit/CoverMediaUpload'

// jsdom no decodifica imágenes: se simula con las dimensiones deseadas.
let nextDimensions = { width: 1080, height: 1080 }

class FakeImage {
  naturalWidth = 0
  naturalHeight = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  set src(_value: string) {
    this.naturalWidth = nextDimensions.width
    this.naturalHeight = nextDimensions.height
    queueMicrotask(() => this.onload?.())
  }
}

beforeEach(() => {
  vi.stubGlobal('Image', FakeImage)
  URL.createObjectURL = vi.fn(() => 'blob:fake')
  URL.revokeObjectURL = vi.fn()
  nextDimensions = { width: 1080, height: 1080 }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderCover() {
  render(
    <CoverMediaUpload
      contentId="11111111-1111-4111-8111-111111111111"
      allowVideo={false}
      coverMedia={null}
    />,
  )
}

function choose(name: string) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['x'], name, { type: 'image/png' })

  fireEvent.change(input, { target: { files: [file] } })
}

function ratioSelect() {
  return screen.getByLabelText(/Ratio/) as HTMLSelectElement
}

describe('CoverMediaUpload — ratio del nombre del archivo (other)', () => {
  it('aplica la proporción del nombre y lo indica', async () => {
    nextDimensions = { width: 1080, height: 1350 }
    renderCover()

    choose('banner-4x5-img.png')

    expect(ratioSelect().value).toBe('4:5')
    expect(screen.getByText('detectado del nombre')).toBeInTheDocument()

    // Encaja con el archivo real: sin aviso.
    await waitFor(() => expect(ratioSelect().value).toBe('4:5'))
    expect(screen.queryByText(/El nombre del archivo indica/)).toBeNull()
  })

  it('avisa antes de subir si el nombre no encaja con las dimensiones reales', async () => {
    nextDimensions = { width: 1080, height: 1080 }
    renderCover()

    choose('banner-4x5-img.png')

    await waitFor(() =>
      expect(
        screen.getByText(/El nombre del archivo indica 4:5/),
      ).toBeInTheDocument(),
    )
    // El ratio del nombre se respeta (el admin decide), pero puede corregirlo.
    expect(ratioSelect().value).toBe('4:5')

    fireEvent.change(ratioSelect(), { target: { value: '1:1' } })

    expect(screen.queryByText(/El nombre del archivo indica/)).toBeNull()
    expect(screen.queryByText('detectado del nombre')).toBeNull()
  })

  it('sin proporción en el nombre sugiere la de las dimensiones, como antes', async () => {
    nextDimensions = { width: 1920, height: 1080 }
    renderCover()

    choose('banner.png')

    await waitFor(() => expect(ratioSelect().value).toBe('16:9'))
    expect(screen.queryByText('detectado del nombre')).toBeNull()
  })
})

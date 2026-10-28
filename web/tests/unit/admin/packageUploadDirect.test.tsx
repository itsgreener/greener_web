// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const STAGED_PATH = `_incoming/${CONTENT_ID}/4f1b2c3d-5e6f-4a7b-8c9d-0e1f2a3b4c5d.zip`

const prepare = vi.fn()
const upload = vi.fn()
const uploadToSignedUrl = vi.fn()
const from = vi.fn(() => ({ uploadToSignedUrl }))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/packageActions', () => ({
  prepareHtmlPackageUploadAction: (...args: unknown[]) => prepare(...args),
  uploadHtmlPackageAction: async (_state: unknown, data: FormData) =>
    upload(data),
  publishHtmlPackageVersionAction: vi.fn(),
  deleteHtmlPackageVersionAction: vi.fn(),
  deleteOldHtmlPackageVersionsAction: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from } }),
}))

import PackageUpload from '@/app/admin/(panel)/contents/[id]/edit/PackageUpload'

function zipOfSize(bytes: number) {
  return new File([new Uint8Array(bytes)], 'paquete.zip', {
    type: 'application/zip',
  })
}

function renderUpload() {
  const view = render(<PackageUpload contentId={CONTENT_ID} versions={[]} />)
  const input = view.container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement
  const form = view.container.querySelector('form') as HTMLFormElement

  return { input, form }
}

async function submit(form: HTMLFormElement) {
  await act(async () => {
    fireEvent.submit(form)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  prepare.mockResolvedValue({
    ok: true,
    bucket: 'html-packages',
    path: STAGED_PATH,
    token: 'tok',
  })
  uploadToSignedUrl.mockResolvedValue({ data: {}, error: null })
  upload.mockResolvedValue({ success: true })
})

describe('PackageUpload · subida directa del ZIP', () => {
  it('sube el ZIP a Storage con la URL firmada y envía a la acción solo la ruta', async () => {
    const { input, form } = renderUpload()
    const file = zipOfSize(3 * 1000 * 1000)

    fireEvent.change(input, { target: { files: [file] } })
    await submit(form)

    expect(prepare).toHaveBeenCalledWith(CONTENT_ID)
    expect(from).toHaveBeenCalledWith('html-packages')
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      STAGED_PATH,
      'tok',
      file,
      expect.objectContaining({ contentType: 'application/zip' }),
    )

    expect(upload).toHaveBeenCalledTimes(1)
    const sent = upload.mock.calls[0][0] as FormData
    expect(sent.get('contentId')).toBe(CONTENT_ID)
    expect(sent.get('stagedPath')).toBe(STAGED_PATH)
    // El ZIP no viaja en la petición a la función (límite de ~4,5 MB).
    expect(sent.has('file')).toBe(false)
    expect([...sent.values()].some((v) => v instanceof File)).toBe(false)
  })

  it('un ZIP por encima del tope se rechaza en el navegador, sin pedir nada', async () => {
    const { input, form } = renderUpload()

    fireEvent.change(input, {
      target: { files: [zipOfSize(3_500_001)] },
    })
    await submit(form)

    expect(screen.getByText(/supera el límite de 3,5 MB/)).toBeInTheDocument()
    expect(prepare).not.toHaveBeenCalled()
    expect(uploadToSignedUrl).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
  })

  it('si no se puede preparar la subida, muestra el error y no sube nada', async () => {
    prepare.mockResolvedValue({
      ok: false,
      error: 'No se ha podido preparar la subida.',
    })
    const { input, form } = renderUpload()

    fireEvent.change(input, { target: { files: [zipOfSize(1000)] } })
    await submit(form)

    expect(
      screen.getByText('No se ha podido preparar la subida.'),
    ).toBeInTheDocument()
    expect(uploadToSignedUrl).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
  })

  it('si falla la subida a Storage, avisa y no llama a la acción', async () => {
    uploadToSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Payload too large' },
    })
    const { input, form } = renderUpload()

    fireEvent.change(input, { target: { files: [zipOfSize(1000)] } })
    await submit(form)

    expect(
      screen.getByText(/No se ha podido subir el archivo/),
    ).toBeInTheDocument()
    expect(upload).not.toHaveBeenCalled()
  })

  it('sin archivo seleccionado no hace nada', async () => {
    const { form } = renderUpload()

    await submit(form)

    expect(prepare).not.toHaveBeenCalled()
  })

  it('muestra los issues que devuelve la validación del contrato', async () => {
    upload.mockResolvedValue({
      error: 'El ZIP no cumple el contrato de paquete.',
      issues: ['Falta index.html en la raíz del ZIP (§12.2).'],
    })
    const { input, form } = renderUpload()

    fireEvent.change(input, { target: { files: [zipOfSize(1000)] } })
    await submit(form)

    expect(
      screen.getByText('Falta index.html en la raíz del ZIP (§12.2).'),
    ).toBeInTheDocument()
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const ACTIVE_ID = '11111111-2222-4333-8444-555555555551'
const OLD_ID = '11111111-2222-4333-8444-555555555552'
const DRAFT_ID = '11111111-2222-4333-8444-555555555553'

vi.mock('@/app/admin/(panel)/contents/[id]/edit/packageActions', () => ({
  prepareHtmlPackageUploadAction: vi.fn(),
  uploadHtmlPackageAction: vi.fn(),
  publishHtmlPackageVersionAction: vi.fn(),
  deleteHtmlPackageVersionAction: vi.fn(),
  deleteOldHtmlPackageVersionsAction: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: vi.fn() } }),
}))

import PackageUpload from '@/app/admin/(panel)/contents/[id]/edit/PackageUpload'

const versions = [
  {
    id: DRAFT_ID,
    version: 3,
    status: 'draft' as const,
    createdAt: '2026-11-11T10:00:00Z',
    storagePath: `${CONTENT_ID}/v3`,
  },
  {
    id: ACTIVE_ID,
    version: 2,
    status: 'published' as const,
    createdAt: '2026-11-10T10:00:00Z',
    storagePath: `${CONTENT_ID}/v2`,
  },
  {
    id: OLD_ID,
    version: 1,
    status: 'rolled_back' as const,
    createdAt: '2026-11-09T10:00:00Z',
    storagePath: `${CONTENT_ID}/v1`,
  },
]

const fetchMock = vi.fn()
const clicked: Array<{ href: string; download: string }> = []

function row(versionLabel: string) {
  return screen.getByText(versionLabel).closest('tr') as HTMLElement
}

function zipResponse(fileName = 'pixel-palette-v2.zip') {
  return new Response('PK-contenido', {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}

function errorResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  clicked.length = 0
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  URL.createObjectURL = vi.fn(() => 'blob:zip')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push({ href: this.href, download: this.download })
  })
  fetchMock.mockResolvedValue(zipResponse())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PackageUpload · botón «Descargar ZIP»', () => {
  it('sale en TODAS las versiones: borrador, activa y anterior', () => {
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    for (const label of ['v3', 'v2', 'v1']) {
      expect(
        within(row(label)).getByRole('button', { name: 'Descargar ZIP' }),
      ).toBeInTheDocument()
    }
  })

  it('convive con las acciones que ya había (publicar, volver, borrar, activa)', () => {
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    expect(
      within(row('v3')).getByRole('button', { name: 'Publicar esta versión' }),
    ).toBeInTheDocument()
    expect(
      within(row('v3')).getByRole('button', { name: 'Borrar versión' }),
    ).toBeInTheDocument()
    expect(within(row('v2')).getByText('Activa')).toBeInTheDocument()
    expect(
      within(row('v1')).getByRole('button', { name: 'Volver a esta versión' }),
    ).toBeInTheDocument()
    expect(
      within(row('v1')).getByRole('button', { name: 'Borrar versión' }),
    ).toBeInTheDocument()
  })

  it('pide a la ruta de admin esa versión de ese contenido (y no otra)', async () => {
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    await act(async () => {
      fireEvent.click(
        within(row('v1')).getByRole('button', { name: 'Descargar ZIP' }),
      )
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url] = fetchMock.mock.calls[0] as [string]
    const parsed = new URL(url, 'https://itsgreener.com')

    expect(parsed.pathname).toBe('/api/admin/packages/download')
    expect(parsed.searchParams.get('content')).toBe(CONTENT_ID)
    expect(parsed.searchParams.get('version')).toBe(OLD_ID)
  })

  it('descarga el fichero con el nombre que manda la ruta', async () => {
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    await act(async () => {
      fireEvent.click(
        within(row('v2')).getByRole('button', { name: 'Descargar ZIP' }),
      )
    })

    expect(clicked).toEqual([
      { href: 'blob:zip', download: 'pixel-palette-v2.zip' },
    ])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:zip')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('si la ruta no manda nombre, usa uno de reserva con el número de versión', async () => {
    fetchMock.mockResolvedValue(new Response('PK', { status: 200 }))
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    await act(async () => {
      fireEvent.click(
        within(row('v3')).getByRole('button', { name: 'Descargar ZIP' }),
      )
    })

    expect(clicked[0].download).toBe('paquete-v3.zip')
  })

  it('un error de la ruta se enseña junto al botón y no descarga nada', async () => {
    fetchMock.mockResolvedValue(
      errorResponse(413, 'El ZIP reconstruido pesa 4,7 MB.'),
    )
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    await act(async () => {
      fireEvent.click(
        within(row('v2')).getByRole('button', { name: 'Descargar ZIP' }),
      )
    })

    expect(within(row('v2')).getByRole('alert')).toHaveTextContent(
      'El ZIP reconstruido pesa 4,7 MB.',
    )
    expect(clicked).toHaveLength(0)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('una respuesta de error sin JSON usa un mensaje genérico', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>502</html>', { status: 502 }),
    )
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    await act(async () => {
      fireEvent.click(
        within(row('v2')).getByRole('button', { name: 'Descargar ZIP' }),
      )
    })

    expect(within(row('v2')).getByRole('alert')).toHaveTextContent(
      'No se ha podido descargar el ZIP.',
    )
  })

  it('si la red falla, avisa y el botón vuelve a estar disponible', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    await act(async () => {
      fireEvent.click(
        within(row('v2')).getByRole('button', { name: 'Descargar ZIP' }),
      )
    })

    expect(within(row('v2')).getByRole('alert')).toHaveTextContent(
      'No se ha podido descargar el ZIP.',
    )
    expect(
      within(row('v2')).getByRole('button', { name: 'Descargar ZIP' }),
    ).toBeEnabled()
  })

  it('mientras prepara el ZIP el botón se bloquea y no lanza una segunda petición', async () => {
    let finish: (response: Response) => void = () => {}

    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve
      }),
    )
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    const button = within(row('v2')).getByRole('button', {
      name: 'Descargar ZIP',
    })

    await act(async () => {
      fireEvent.click(button)
    })

    const busy = within(row('v2')).getByRole('button', { name: 'Preparando…' })

    expect(busy).toBeDisabled()

    await act(async () => {
      fireEvent.click(busy)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      finish(zipResponse())
    })

    expect(
      within(row('v2')).getByRole('button', { name: 'Descargar ZIP' }),
    ).toBeEnabled()
  })

  it('tras un error, un nuevo intento limpia el aviso', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(503, 'No se ha podido preparar el ZIP.'),
    )
    render(<PackageUpload contentId={CONTENT_ID} versions={versions} />)

    const click = async () =>
      act(async () => {
        fireEvent.click(
          within(row('v2')).getByRole('button', { name: 'Descargar ZIP' }),
        )
      })

    await click()
    expect(within(row('v2')).getByRole('alert')).toBeInTheDocument()

    await click()
    expect(within(row('v2')).queryByRole('alert')).toBeNull()
    expect(clicked).toHaveLength(1)
  })
})

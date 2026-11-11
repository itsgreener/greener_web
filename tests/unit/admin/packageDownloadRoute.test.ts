import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const CONTENT = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const VERSION = '9f8e7d6c-5b4a-4f2e-8d0c-b9a8f7e6d5c4'

const adminApiGuard = vi.fn()
const downloadHtmlPackageVersion = vi.fn()

vi.mock('@/lib/auth/adminSession', () => ({
  adminApiGuard: () => adminApiGuard(),
}))

vi.mock('@/modules/packages/container', () => ({
  downloadHtmlPackageVersion: (input: unknown) =>
    downloadHtmlPackageVersion(input),
}))

const { GET } = await import('@/app/api/admin/packages/download/route')
const { PackageDownloadTooLargeError } =
  await import('@/modules/packages/domain/packageErrors')

function request(search: string) {
  return new NextRequest(
    `https://itsgreener.com/api/admin/packages/download${search}`,
  )
}

const VALID = `?content=${CONTENT}&version=${VERSION}`

beforeEach(() => {
  adminApiGuard.mockReset().mockResolvedValue(null)
  downloadHtmlPackageVersion.mockReset().mockResolvedValue({
    fileName: 'pixel-palette-v3.zip',
    zip: Buffer.from('PK-contenido'),
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/admin/packages/download', () => {
  it('sin sesión de admin devuelve lo que diga la guarda y no lee nada', async () => {
    adminApiGuard.mockResolvedValue(
      NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    )

    const response = await GET(request(VALID))

    expect(response.status).toBe(401)
    expect(downloadHtmlPackageVersion).not.toHaveBeenCalled()
  })

  it('un usuario sin permisos de admin recibe 403 y no lee nada', async () => {
    adminApiGuard.mockResolvedValue(
      NextResponse.json({ error: 'No autorizado' }, { status: 403 }),
    )

    expect((await GET(request(VALID))).status).toBe(403)
    expect(downloadHtmlPackageVersion).not.toHaveBeenCalled()
  })

  it.each([
    '',
    `?content=${CONTENT}`,
    `?version=${VERSION}`,
    `?content=no-es-uuid&version=${VERSION}`,
    `?content=${CONTENT}&version=tampoco`,
    '?path=11111111-2222-4333-8444-555555555555/v1/index.html',
  ])('parámetros no válidos (%s): 400 sin leer nada', async (search) => {
    const response = await GET(request(search))

    expect(response.status).toBe(400)
    expect(downloadHtmlPackageVersion).not.toHaveBeenCalled()
  })

  it('entrega el ZIP como descarga, sin caché y con su tamaño', async () => {
    const response = await GET(request(VALID))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/zip')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="pixel-palette-v3.zip"',
    )
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Length')).toBe(
      String(Buffer.from('PK-contenido').byteLength),
    )
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe(
      'PK-contenido',
    )
  })

  it('pasa al caso de uso solo los dos ids', async () => {
    await GET(request(VALID))

    expect(downloadHtmlPackageVersion).toHaveBeenCalledWith({
      contentId: CONTENT,
      versionId: VERSION,
    })
  })

  it('una versión que no existe da 404 con JSON', async () => {
    downloadHtmlPackageVersion.mockResolvedValue(null)

    const response = await GET(request(VALID))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: 'No se ha encontrado esa versión del paquete.',
    })
  })

  it('un ZIP demasiado grande da 413 con el tamaño', async () => {
    downloadHtmlPackageVersion.mockRejectedValue(
      new PackageDownloadTooLargeError(4_700_000),
    )

    const response = await GET(request(VALID))
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(413)
    expect(body.error).toContain('4,7 MB')
    expect(body.error).toContain('4,4 MB')
  })

  it('un fallo cualquiera da 503 sin filtrar su texto', async () => {
    downloadHtmlPackageVersion.mockRejectedValue(new Error('secreto interno'))

    const response = await GET(request(VALID))

    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('secreto')
  })

  it('los errores tampoco se cachean', async () => {
    downloadHtmlPackageVersion.mockResolvedValue(null)

    expect((await GET(request(VALID))).headers.get('Cache-Control')).toBe(
      'no-store',
    )
    expect((await GET(request(''))).headers.get('Cache-Control')).toBe(
      'no-store',
    )
  })
})

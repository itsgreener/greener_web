import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Las dos rutas de assets (tools, insights y páginas satélite) — cabeceras de caché reales
 * de la respuesta, no solo la lógica interna. Storage va simulado.
 */

const getStoragePackageAsset = vi.fn()

vi.mock('@/modules/packages/container', () => ({
  publishedPackages: {
    getAsset: (...args: unknown[]) => getStoragePackageAsset(...args),
  },
}))

const ROUTES = [
  {
    kind: 'tool' as const,
    load: () =>
      import('@/app/(public)/(detail)/tools/[slug]/app/assets/[...file]/route'),
  },
  {
    kind: 'insight' as const,
    load: () =>
      import('@/app/(public)/(detail)/insights/[slug]/app/assets/[...file]/route'),
  },
  {
    kind: 'variety' as const,
    load: () =>
      import('@/app/(public)/(detail)/variety/[slug]/app/assets/[...file]/route'),
  },
]

function request(ifNoneMatch?: string) {
  return new NextRequest('http://localhost:3000/x/mi-slug/app/assets/main.js', {
    headers: ifNoneMatch ? { 'if-none-match': ifNoneMatch } : {},
  })
}

const params = (file: string[]) => ({
  params: Promise.resolve({ slug: 'mi-slug', file }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each(ROUTES)('ruta de assets de $kind', ({ kind, load }) => {
  it('200: manda ETag, Content-Type correcto y Cache-Control de revalidación (nunca immutable)', async () => {
    getStoragePackageAsset.mockResolvedValue({
      notModified: false,
      etag: '"abc"',
      data: Buffer.from('body{}'),
    })
    const { GET } = await load()

    const response = await GET(request(), params(['style.css']))

    expect(response.status).toBe(200)
    expect(response.headers.get('etag')).toBe('"abc"')
    expect(response.headers.get('content-type')).toBe('text/css; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('public, no-cache')
    expect(response.headers.get('cache-control')).not.toContain('immutable')
    expect(await response.text()).toBe('body{}')
  })

  it('reenvía If-None-Match al origen y pide el tipo de contenido correcto', async () => {
    getStoragePackageAsset.mockResolvedValue({
      notModified: true,
      etag: '"abc"',
    })
    const { GET } = await load()

    await GET(request('"abc"'), params(['assets-sub', 'main.js']))

    // Next consume `assets` como segmento fijo, pero en Storage el asset vive
    // bajo <storage_path>/assets/...: la ruta tiene que volver a anteponerlo.
    expect(getStoragePackageAsset).toHaveBeenCalledWith(
      kind,
      'mi-slug',
      ['assets', 'assets-sub', 'main.js'],
      '"abc"',
    )
  })

  it('un asset en la raíz de assets/ también lleva el prefijo', async () => {
    getStoragePackageAsset.mockResolvedValue({
      notModified: true,
      etag: '"abc"',
    })
    const { GET } = await load()

    await GET(request('"abc"'), params(['main.js']))

    expect(getStoragePackageAsset).toHaveBeenCalledWith(
      kind,
      'mi-slug',
      ['assets', 'main.js'],
      '"abc"',
    )
  })

  it('304: sin cuerpo, con ETag y Cache-Control', async () => {
    getStoragePackageAsset.mockResolvedValue({
      notModified: true,
      etag: '"abc"',
    })
    const { GET } = await load()

    const response = await GET(request('"abc"'), params(['main.js']))

    expect(response.status).toBe(304)
    expect(response.headers.get('etag')).toBe('"abc"')
    expect(response.headers.get('cache-control')).toBe('public, no-cache')
    expect(await response.text()).toBe('')
  })

  it('404 si el paquete o el asset no existen', async () => {
    const { PackageNotFoundError } =
      await import('@/modules/packages/domain/manifest')
    getStoragePackageAsset.mockRejectedValue(new PackageNotFoundError('x'))
    const { GET } = await load()

    const response = await GET(request(), params(['nada.js']))

    expect(response.status).toBe(404)
  })

  it('503 con Retry-After si Supabase o Storage no responden (no un 404)', async () => {
    const { PackageSourceUnavailableError } =
      await import('@/modules/packages/domain/manifest')
    getStoragePackageAsset.mockRejectedValue(
      new PackageSourceUnavailableError('x'),
    )
    const { GET } = await load()

    const response = await GET(request(), params(['main.js']))

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('30')
  })

  it('un error inesperado no se disfraza de 404', async () => {
    getStoragePackageAsset.mockRejectedValue(new Error('Supabase caído'))
    const { GET } = await load()

    await expect(GET(request(), params(['main.js']))).rejects.toThrow(
      'Supabase caído',
    )
  })
})

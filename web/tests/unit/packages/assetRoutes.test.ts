import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Las dos rutas de assets (tools e insights) — cabeceras de caché reales
 * de la respuesta, no solo la lógica interna. Storage va simulado.
 */

const getStoragePackageAsset = vi.fn()

vi.mock('@/modules/packages/infrastructure/supabaseStorageSource', () => ({
  getStoragePackageAsset: (...args: unknown[]) =>
    getStoragePackageAsset(...args),
}))

const ROUTES = [
  {
    kind: 'tool' as const,
    load: () =>
      import('@/app/(public)/tools/[slug]/app/assets/[...file]/route'),
  },
  {
    kind: 'insight' as const,
    load: () =>
      import('@/app/(public)/insights/[slug]/app/assets/[...file]/route'),
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

    // Bug real corregido el 29 sep: la ruta debe volver a anteponer
    // 'assets' — Next.js ya lo consume como segmento fijo de la propia
    // ruta antes de pasarle `file`, pero en Storage el asset vive bajo
    // <storage_path>/assets/... (todo lo que no sea index.html/manifest.json
    // sube conservando su ruta dentro del ZIP). Sin este prefijo, TODO
    // asset de TODO paquete daba 404 contra Storage real.
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

  it('un error inesperado no se disfraza de 404', async () => {
    getStoragePackageAsset.mockRejectedValue(new Error('Supabase caído'))
    const { GET } = await load()

    await expect(GET(request(), params(['main.js']))).rejects.toThrow(
      'Supabase caído',
    )
  })
})

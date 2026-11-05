import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * SEC-T7 y SEC-T8 de la auditoría de seguridad del 23 oct: las rutas de
 * paquetes no pasan por el proxy, así que ninguna cabecera global les llega.
 * Estos tests fijan que TODAS sus respuestas (documento, assets, 304, 404 y
 * 503) llevan las cabeceras básicas, que el documento lleva la CSP completa
 * y que un asset que se puede abrir como documento lleva una CSP sin scripts.
 */

const getPackage = vi.fn()
const getAsset = vi.fn()

vi.mock('@/modules/packages/container', () => ({
  composeToolDocument: () => '<html>ok</html>',
  publishedPackages: {
    getPackage: (...args: unknown[]) => getPackage(...args),
    getAsset: (...args: unknown[]) => getAsset(...args),
  },
}))

import { contentTypeFor } from '@/modules/packages/domain/packageFiles'
import {
  PackageNotFoundError,
  PackageSourceUnavailableError,
} from '@/modules/packages/domain/manifest'
import {
  PACKAGE_ACTIVE_ASSET_CSP,
  PACKAGE_BASE_SECURITY_HEADERS,
  PACKAGE_DOCUMENT_CSP,
  isActiveAsset,
} from '@/lib/http/packageSecurityHeaders'

const SECTIONS = [
  {
    dir: 'tools',
    document: () => import('@/app/(public)/(detail)/tools/[slug]/app/route'),
    assets: () =>
      import('@/app/(public)/(detail)/tools/[slug]/app/assets/[...file]/route'),
  },
  {
    dir: 'insights',
    document: () => import('@/app/(public)/(detail)/insights/[slug]/app/route'),
    assets: () =>
      import('@/app/(public)/(detail)/insights/[slug]/app/assets/[...file]/route'),
  },
  {
    dir: 'variety',
    document: () => import('@/app/(public)/(detail)/variety/[slug]/app/route'),
    assets: () =>
      import('@/app/(public)/(detail)/variety/[slug]/app/assets/[...file]/route'),
  },
] as const

const docParams = { params: Promise.resolve({ slug: 'mi-pieza' }) }

function assetParams(...file: string[]) {
  return { params: Promise.resolve({ slug: 'mi-pieza', file }) }
}

const request = () => new NextRequest('http://localhost/x/mi-pieza/app')

function expectBaseHeaders(response: Response) {
  for (const [name, value] of Object.entries(PACKAGE_BASE_SECURITY_HEADERS)) {
    expect(response.headers.get(name), name).toBe(value)
  }
}

function asset(overrides: Record<string, unknown> = {}) {
  return {
    data: Buffer.from('contenido'),
    etag: '"abc"',
    notModified: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CSP del documento de un paquete (SEC-PUB-B2)', () => {
  it.each([
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ])('incluye %s (no heredan de default-src)', (directive) => {
    expect(PACKAGE_DOCUMENT_CSP).toContain(directive)
  })

  it("sigue sin permitir scripts ni conexiones fuera de 'self'", () => {
    expect(PACKAGE_DOCUMENT_CSP).toContain("script-src 'self'")
    expect(PACKAGE_DOCUMENT_CSP).toContain("connect-src 'self'")
    expect(PACKAGE_DOCUMENT_CSP).not.toMatch(/unsafe-eval|https?:/)
  })
})

describe.each(SECTIONS)(
  '/$dir: todas las respuestas llevan las cabeceras',
  (s) => {
    it('el documento (200) lleva las básicas y la CSP completa', async () => {
      getPackage.mockResolvedValue({ slug: 'mi-pieza' })
      const { GET } = await s.document()

      const response = await GET(request(), docParams)

      expect(response.status).toBe(200)
      expectBaseHeaders(response)
      expect(response.headers.get('Content-Security-Policy')).toBe(
        PACKAGE_DOCUMENT_CSP,
      )
    })

    it('el documento no encontrado (404) lleva las básicas', async () => {
      getPackage.mockRejectedValue(new PackageNotFoundError('mi-pieza'))
      const { GET } = await s.document()

      const response = await GET(request(), docParams)

      expect(response.status).toBe(404)
      expectBaseHeaders(response)
    })

    it('el documento con Storage caído (503) lleva las básicas y Retry-After', async () => {
      getPackage.mockRejectedValue(new PackageSourceUnavailableError('caído'))
      const { GET } = await s.document()

      const response = await GET(request(), docParams)

      expect(response.status).toBe(503)
      expect(response.headers.get('Retry-After')).toBe('30')
      expectBaseHeaders(response)
    })

    it('un asset (200) lleva las básicas', async () => {
      getAsset.mockResolvedValue(asset())
      const { GET } = await s.assets()

      const response = await GET(request(), assetParams('main.js'))

      expect(response.status).toBe(200)
      expectBaseHeaders(response)
    })

    it('un asset sin cambios (304) lleva las básicas', async () => {
      getAsset.mockResolvedValue(asset({ notModified: true }))
      const { GET } = await s.assets()

      const response = await GET(request(), assetParams('main.js'))

      expect(response.status).toBe(304)
      expectBaseHeaders(response)
    })

    it('un asset no encontrado (404) lleva las básicas', async () => {
      getAsset.mockRejectedValue(new PackageNotFoundError('mi-pieza'))
      const { GET } = await s.assets()

      const response = await GET(request(), assetParams('nada.js'))

      expect(response.status).toBe(404)
      expectBaseHeaders(response)
    })

    it('un asset con Storage caído (503) lleva las básicas', async () => {
      getAsset.mockRejectedValue(new PackageSourceUnavailableError('caído'))
      const { GET } = await s.assets()

      const response = await GET(request(), assetParams('main.js'))

      expect(response.status).toBe(503)
      expectBaseHeaders(response)
    })

    it.each([
      'pagina.html',
      'pagina.htm',
      'icono.svg',
      'MAYUS.SVG',
      'a/b/Doc.HTML',
    ])('el asset %s sale con CSP sin scripts (SEC-T8)', async (name) => {
      getAsset.mockResolvedValue(asset())
      const { GET } = await s.assets()

      const response = await GET(request(), assetParams(...name.split('/')))

      expect(response.headers.get('Content-Security-Policy')).toBe(
        PACKAGE_ACTIVE_ASSET_CSP,
      )
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it.each(['main.js', 'style.css', 'logo.png', 'font.woff2', 'datos.json'])(
      'el asset %s no lleva CSP propia (no es un documento)',
      async (name) => {
        getAsset.mockResolvedValue(asset())
        const { GET } = await s.assets()

        const response = await GET(request(), assetParams(name))

        expect(response.headers.get('Content-Security-Policy')).toBeNull()
      },
    )
  },
)

describe('isActiveAsset', () => {
  it('detecta los que el navegador puede abrir como documento', () => {
    expect(isActiveAsset('a.html')).toBe(true)
    expect(isActiveAsset('a.HTM')).toBe(true)
    expect(isActiveAsset('a.svg')).toBe(true)
  })

  it('no confunde un nombre que contiene la palabra con la extensión', () => {
    expect(isActiveAsset('svg.png')).toBe(false)
    expect(isActiveAsset('html.js')).toBe(false)
    expect(isActiveAsset('sin-extension')).toBe(false)
  })

  // La garantía de fondo: todo lo que el servidor sirve como documento HTML
  // o SVG lleva la CSP, porque las dos funciones leen la extensión igual.
  it.each([
    'a.html',
    'a.HTM',
    'a.svg',
    'html',
    'svg',
    'a.js',
    'a.css',
    'a.png',
    'a.json',
    'a.bin',
    'sin-extension',
    '.html',
    'a.b.html',
  ])('coincide con el Content-Type que se sirve para %s', (name) => {
    const type = contentTypeFor(name)
    const servedAsDocument =
      type.startsWith('text/html') || type.startsWith('image/svg+xml')

    expect(isActiveAsset(name)).toBe(servedAsDocument)
  })

  it('la CSP de los activos no permite nada', () => {
    expect(PACKAGE_ACTIVE_ASSET_CSP).toBe("default-src 'none'; sandbox")
  })
})

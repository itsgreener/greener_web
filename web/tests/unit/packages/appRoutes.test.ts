import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Las dos rutas que sirven el documento completo de una tool/insight
 * (/tools|insights/[slug]/app, distintas de las de sus assets — ver
 * assetRoutes.test.ts). Cabeceras de seguridad añadidas el 29 sep
 * (PROGRESO §4.8): src/proxy.ts salta estas rutas enteras para no
 * mezclar su CSP propia con la global, lo que dejaba sin HSTS ni
 * Referrer-Policy — no solo sin CSP global, que sí era intencional.
 */

const getStoragePackage = vi.fn()

vi.mock('@/modules/packages/infrastructure/supabaseStorageSource', () => ({
  getStoragePackage: (...args: unknown[]) => getStoragePackage(...args),
}))

const SAMPLE_PACKAGE = {
  slug: 'mi-tool',
  html: '<html><head></head><body>hola</body></html>',
  manifest: {
    kind: 'tool',
    entrypoint: 'index.html',
    version: 1,
    requiredCapabilities: [],
    externalDomains: [],
    minViewport: { width: 320, height: 420 },
  },
}

const ROUTES = [
  {
    kind: 'tool' as const,
    load: () => import('@/app/(public)/tools/[slug]/app/route'),
  },
  {
    kind: 'insight' as const,
    load: () => import('@/app/(public)/insights/[slug]/app/route'),
  },
]

const params = { params: Promise.resolve({ slug: 'mi-tool' }) }
const request = () => new NextRequest('http://localhost/tools/mi-tool/app')

beforeEach(() => {
  // Limpia solo el historial de llamadas (no los mockResolvedValue /
  // mockRejectedValue, que cada test fija explícitamente antes de usarlos).
  vi.clearAllMocks()
})

describe.each(ROUTES)('/$kind/[slug]/app', ({ kind, load }) => {
  it('200: lleva HSTS, Referrer-Policy, su propia CSP y X-Content-Type-Options', async () => {
    getStoragePackage.mockResolvedValue(SAMPLE_PACKAGE)
    const { GET } = await load()

    const response = await GET(request(), params)

    expect(response.status).toBe(200)
    expect(response.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains; preload',
    )
    expect(response.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    )
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-security-policy')).toContain(
      "script-src 'self'",
    )
    expect(getStoragePackage).toHaveBeenCalledWith(kind, 'mi-tool')
  })

  it('404 (paquete no encontrado) sigue funcionando igual que antes', async () => {
    const { PackageNotFoundError } =
      await import('@/modules/packages/domain/manifest')
    getStoragePackage.mockRejectedValue(new PackageNotFoundError('mi-tool'))
    const { GET } = await load()

    const response = await GET(request(), params)

    expect(response.status).toBe(404)
  })
})

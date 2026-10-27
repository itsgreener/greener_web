import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Las seis rutas de paquetes (documento y assets de tools, insights y
 * variety) salen de dos fábricas (PUB-C1 de la auditoría TSX). Estos tests
 * fijan lo que antes dependía de que tres copias se cambiaran a la vez: las
 * cabeceras de seguridad, el 404 de cada sección, el ancho de la barra
 * lateral y que ninguna ruta vuelva a llevar su propia copia.
 */

const getPackage = vi.fn()
const getAsset = vi.fn()
const composeToolDocument = vi.fn(() => '<html>ok</html>')

vi.mock('@/modules/packages/container', () => ({
  composeToolDocument: (...args: unknown[]) =>
    (composeToolDocument as (...a: unknown[]) => string)(...args),
  publishedPackages: {
    getPackage: (...args: unknown[]) => getPackage(...args),
    getAsset: (...args: unknown[]) => getAsset(...args),
  },
}))

import {
  PACKAGE_DOCUMENT_HEADERS,
  SIDEBAR_WIDTH_PX,
} from '@/app/(public)/(detail)/_lib/packageRoutes'
import { PackageNotFoundError } from '@/modules/packages/domain/manifest'

const SECTIONS = [
  {
    dir: 'tools',
    kind: 'tool',
    notFound: 'Tool no encontrada',
    load: () => import('@/app/(public)/(detail)/tools/[slug]/app/route'),
  },
  {
    dir: 'insights',
    kind: 'insight',
    notFound: 'Insight no encontrado',
    load: () => import('@/app/(public)/(detail)/insights/[slug]/app/route'),
  },
  {
    dir: 'variety',
    kind: 'variety',
    notFound: 'Página no encontrada',
    load: () => import('@/app/(public)/(detail)/variety/[slug]/app/route'),
  },
] as const

const params = { params: Promise.resolve({ slug: 'mi-pieza' }) }
const request = () => new NextRequest('http://localhost/x/mi-pieza/app')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('cabeceras del documento de un paquete', () => {
  it('son exactamente las cinco de siempre', () => {
    expect(PACKAGE_DOCUMENT_HEADERS).toEqual({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:;",
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security':
        'max-age=63072000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    })
  })

  it.each(SECTIONS)(
    '/$dir/[slug]/app responde con ellas',
    async ({ load, kind }) => {
      getPackage.mockResolvedValue({ slug: 'mi-pieza' })
      const { GET } = await load()

      const response = await GET(request(), params)

      expect(response.status).toBe(200)

      for (const [name, value] of Object.entries(PACKAGE_DOCUMENT_HEADERS)) {
        expect(response.headers.get(name)).toBe(value)
      }

      expect(getPackage).toHaveBeenCalledWith(kind, 'mi-pieza')
    },
  )
})

describe('el 404 de cada sección', () => {
  it.each(SECTIONS)(
    '/$dir/[slug]/app dice «$notFound»',
    async ({ load, notFound }) => {
      getPackage.mockRejectedValue(new PackageNotFoundError('mi-pieza'))
      const { GET } = await load()

      const response = await GET(request(), params)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe(notFound)
    },
  )
})

describe('la ruta base y el ancho de la barra lateral', () => {
  it.each(SECTIONS)(
    '/$dir/[slug]/app compone el documento con su ruta base y el ancho de la barra',
    async ({ load, dir }) => {
      getPackage.mockResolvedValue({ slug: 'mi-pieza' })
      const { GET } = await load()

      await GET(request(), params)

      expect(composeToolDocument).toHaveBeenCalledWith(
        { slug: 'mi-pieza' },
        {
          width: `calc(100cqw - ${SIDEBAR_WIDTH_PX}px)`,
          height: '100dvh',
          sidebarWidth: SIDEBAR_WIDTH_PX,
        },
        `/${dir}/mi-pieza/app/`,
        expect.any(String),
      )
    },
  )

  it('SIDEBAR_WIDTH_PX coincide con --sidebar-width de globals.css', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    const match = css.match(/--sidebar-width:\s*(\d+)px/)

    expect(match).not.toBeNull()
    expect(Number(match![1])).toBe(SIDEBAR_WIDTH_PX)
  })
})

describe('el tipo de paquete de los assets de cada sección', () => {
  const ASSET_ROUTES = [
    {
      dir: 'tools',
      kind: 'tool',
      load: () =>
        import('@/app/(public)/(detail)/tools/[slug]/app/assets/[...file]/route'),
    },
    {
      dir: 'insights',
      kind: 'insight',
      load: () =>
        import('@/app/(public)/(detail)/insights/[slug]/app/assets/[...file]/route'),
    },
    {
      dir: 'variety',
      kind: 'variety',
      load: () =>
        import('@/app/(public)/(detail)/variety/[slug]/app/assets/[...file]/route'),
    },
  ] as const

  it.each(ASSET_ROUTES)(
    '/$dir/[slug]/app/assets pide el paquete «$kind» y antepone `assets`',
    async ({ load, kind }) => {
      getAsset.mockResolvedValue({ notModified: true, etag: '"abc"' })
      const { GET } = await load()

      const response = await GET(request(), {
        params: Promise.resolve({ slug: 'mi-pieza', file: ['css', 'a.css'] }),
      })

      expect(response.status).toBe(304)
      expect(getAsset).toHaveBeenCalledWith(
        kind,
        'mi-pieza',
        ['assets', 'css', 'a.css'],
        null,
      )
    },
  )
})

describe('ninguna ruta lleva ya su propia copia', () => {
  const ROUTE_FILES = SECTIONS.flatMap(({ dir }) => [
    `src/app/(public)/(detail)/${dir}/[slug]/app/route.ts`,
    `src/app/(public)/(detail)/${dir}/[slug]/app/assets/[...file]/route.ts`,
  ])

  it.each(ROUTE_FILES)('%s solo delega en la fábrica', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8')
    // Sin comentarios, para no contar lo que se explica en ellos.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '')

    expect(code).toContain('_lib/packageRoutes')
    expect(code).toMatch(
      /export const GET = createPackage(Document|Asset)Route\(/,
    )
    expect(code).not.toContain('Content-Security-Policy')
    expect(code).not.toContain('SIDEBAR_WIDTH')
    expect(code.trim().split('\n').length).toBeLessThanOrEqual(10)
  })
})

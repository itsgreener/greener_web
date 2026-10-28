import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { buildAssetResponse } from '@/lib/http/packageAssetResponse'
import { packageErrorResponse } from '@/lib/http/packageErrorResponse'
import {
  PACKAGE_BASE_SECURITY_HEADERS,
  PACKAGE_DOCUMENT_CSP,
} from '@/lib/http/packageSecurityHeaders'
import {
  composeToolDocument,
  publishedPackages,
} from '@/modules/packages/container'
import type { PackageKind } from '@/modules/packages/domain/packageKind'

/**
 * Rutas que sirven un paquete HTML publicado (tools, insights y páginas
 * satélite de `other`): el documento bajo `/<sección>/[slug]/app` y sus assets
 * bajo `/<sección>/[slug]/app/assets/...`. Las tres secciones tenían cada una
 * su copia de las dos rutas, idénticas salvo por el tipo de paquete, la ruta
 * base y el texto de «no encontrado»; las cabeceras de seguridad estaban
 * copiadas tres veces y tenían que cambiar a la vez.
 *
 * Next exige que `GET` sea un export estático de cada `route.ts`: cada ruta
 * hace `export const GET = createPackage…Route(...)`, que es un handler ya
 * construido al cargar el módulo, no algo que se arme en cada petición.
 */

/**
 * Ancho de la barra lateral del Shell, en px. Se comunica al paquete para que
 * calcule su espacio. Debe coincidir con `--sidebar-width` de
 * `app/globals.css` (lo vigila `packageRoutes.test.ts`).
 */
export const SIDEBAR_WIDTH_PX = 64

/**
 * Cabeceras de un documento de paquete. La CSP es propia y aislada (el HTML
 * del paquete es ejecutable y autocontenido: sin dominios externos). El resto
 * de cabeceras de seguridad hay que ponerlas aquí: `src/proxy.ts` salta por
 * completo estas rutas para no mezclar la CSP global con la suya (arquitectura
 * §17.1, PROGRESO §4.8). Los valores viven en
 * `lib/http/packageSecurityHeaders.ts`, compartidos con los assets y con las
 * respuestas de error.
 */
export const PACKAGE_DOCUMENT_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',

  'Content-Security-Policy': PACKAGE_DOCUMENT_CSP,

  ...PACKAGE_BASE_SECURITY_HEADERS,
} as const

type SlugParams = { params: Promise<{ slug: string }> }

type AssetParams = { params: Promise<{ slug: string; file: string[] }> }

/**
 * `GET /<basePath>/[slug]/app`: el HTML del paquete, en el mismo origen y sin
 * iframe. El espacio disponible se comunica al paquete mediante variables
 * CSS: el navegador resuelve `100cqw` y `100dvh` y los actualiza solo cuando
 * cambia el tamaño de la ventana; no se calcula el viewport desde el
 * servidor.
 */
export function createPackageDocumentRoute({
  kind,
  basePath,
  notFoundLabel,
}: {
  kind: PackageKind
  /** Sección pública del paquete: `/tools`, `/insights`, `/variety`. */
  basePath: string
  /** Cuerpo del 404 («Tool no encontrada»). */
  notFoundLabel: string
}) {
  return async function GET(_request: NextRequest, { params }: SlugParams) {
    const { slug } = await params

    try {
      const pkg = await publishedPackages.getPackage(kind, slug)

      const html = composeToolDocument(
        pkg,
        {
          width: `calc(100cqw - ${SIDEBAR_WIDTH_PX}px)`,
          height: '100dvh',
          sidebarWidth: SIDEBAR_WIDTH_PX,
        },
        `${basePath}/${slug}/app/`,
        env.NEXT_PUBLIC_SITE_URL,
      )

      return new NextResponse(html, {
        status: 200,
        headers: PACKAGE_DOCUMENT_HEADERS,
      })
    } catch (error) {
      const response = packageErrorResponse(error, notFoundLabel)

      if (response) return response

      throw error
    }
  }
}

/**
 * `GET /<basePath>/[slug]/app/assets/[...file]`: los assets (CSS, JS, el
 * Worker) del paquete, en el mismo origen (arquitectura §12.1). La lógica
 * común de la respuesta vive en `packageAssetResponse.ts`.
 *
 * `file` es lo que va DESPUÉS de `/assets/` (Next consume ese segmento fijo),
 * pero en Storage el asset vive bajo `<storage_path>/assets/...`: de ahí el
 * `'assets'` que se antepone antes de pedirlo.
 *
 * Caché: revalidación con ETag, NO «immutable» — la URL no lleva la versión
 * del paquete (`modules/packages/domain/assetCaching.ts`).
 */
export function createPackageAssetRoute(kind: PackageKind) {
  return async function GET(request: NextRequest, { params }: AssetParams) {
    const { slug, file } = await params

    try {
      const asset = await publishedPackages.getAsset(
        kind,
        slug,
        ['assets', ...file],
        request.headers.get('if-none-match'),
      )

      return buildAssetResponse(asset, file[file.length - 1] ?? '')
    } catch (error) {
      const response = packageErrorResponse(error, 'Asset no encontrado')

      if (response) return response

      throw error
    }
  }
}

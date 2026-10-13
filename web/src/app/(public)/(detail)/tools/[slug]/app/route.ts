import { NextRequest, NextResponse } from 'next/server'
import { packageErrorResponse } from '@/lib/http/packageErrorResponse'
import {
  composeToolDocument,
  publishedPackages,
} from '@/modules/packages/container'

const SIDEBAR_WIDTH = 64

/**
 * Sirve el HTML real de una tool bajo /tools/[slug]/app.
 *
 * El contenido vive en el mismo origen y no utiliza iframe.
 * El espacio disponible se comunica al paquete mediante variables CSS.
 *
 * No intentamos calcular el viewport desde el servidor: el navegador
 * resuelve 100dvw / 100dvh y actualiza los valores automáticamente
 * cuando cambia el tamaño de la ventana.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const pkg = await publishedPackages.getPackage('tool', slug)

    const html = composeToolDocument(
      pkg,
      {
        width: `calc(100dvw - ${SIDEBAR_WIDTH}px)`,
        height: '100dvh',
        sidebarWidth: SIDEBAR_WIDTH,
      },
      `/tools/${slug}/app/`,
    )

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',

        'Content-Security-Policy':
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:;",

        'X-Content-Type-Options': 'nosniff',

        // HSTS y Referrer-Policy (arquitectura §17.1): src/proxy.ts salta
        // por completo estas rutas para no mezclar la CSP global con la
        // suya (ver proxy.ts), lo que deja fuera las DEMÁS cabeceras de
        // seguridad: se ponen aquí (PROGRESO §4.8). Mismos valores que
        // src/lib/securityHeaders.ts; con estas dos no hay conflicto posible,
        // a diferencia de la CSP.
        'Strict-Transport-Security':
          'max-age=63072000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    })
  } catch (error) {
    const response = packageErrorResponse(error, 'Tool no encontrada')

    if (response) return response

    throw error
  }
}

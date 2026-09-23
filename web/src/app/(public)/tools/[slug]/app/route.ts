import { NextRequest, NextResponse } from 'next/server'
import { getStoragePackage } from '@/modules/packages/infrastructure/supabaseStorageSource'
import { composeToolDocument } from '@/modules/packages/application/composeToolDocument'
import { PackageNotFoundError } from '@/modules/packages/domain/manifest'

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
    const pkg = await getStoragePackage('tool', slug)

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
      },
    })
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      return new NextResponse('Tool no encontrada', {
        status: 404,
      })
    }

    throw error
  }
}

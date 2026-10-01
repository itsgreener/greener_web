import { NextRequest, NextResponse } from 'next/server'
import { getStoragePackage } from '@/modules/packages/infrastructure/supabaseStorageSource'
import { composeToolDocument } from '@/modules/packages/application/composeToolDocument'
import { PackageNotFoundError } from '@/modules/packages/domain/manifest'

const SIDEBAR_WIDTH = 64

/**
 * Sirve el HTML real de un insight bajo /insights/[slug]/app.
 *
 * Tools e Insights comparten el mismo contrato técnico.
 * El viewport disponible se comunica mediante variables CSS dinámicas,
 * resueltas por el navegador.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const pkg = await getStoragePackage('insight', slug)

    const html = composeToolDocument(
      pkg,
      {
        width: `calc(100dvw - ${SIDEBAR_WIDTH}px)`,
        height: '100dvh',
        sidebarWidth: SIDEBAR_WIDTH,
      },
      `/insights/${slug}/app/`,
    )

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',

        'Content-Security-Policy':
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:;",

        'X-Content-Type-Options': 'nosniff',

        // Ver el mismo comentario en tools/[slug]/app/route.ts.
        'Strict-Transport-Security':
          'max-age=63072000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    })
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      return new NextResponse('Insight no encontrado', {
        status: 404,
      })
    }

    throw error
  }
}

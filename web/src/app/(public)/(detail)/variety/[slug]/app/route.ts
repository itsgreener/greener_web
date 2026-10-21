import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { packageErrorResponse } from '@/lib/http/packageErrorResponse'
import {
  composeToolDocument,
  publishedPackages,
} from '@/modules/packages/container'

const SIDEBAR_WIDTH = 64

/**
 * Sirve el HTML real de una página satélite (`other` de tipo page) bajo
 * /variety/[slug]/app (plan de `other`, fase 4).
 *
 * Tools, Insights y páginas satélite comparten el mismo contrato técnico y la
 * misma CSP aislada (`default-src 'self'; connect-src 'self'`): una página
 * satélite debe ser autocontenida.
 * El viewport disponible se comunica mediante variables CSS dinámicas,
 * resueltas por el navegador.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const pkg = await publishedPackages.getPackage('variety', slug)

    const html = composeToolDocument(
      pkg,
      {
        width: `calc(100cqw - ${SIDEBAR_WIDTH}px)`,
        height: '100dvh',
        sidebarWidth: SIDEBAR_WIDTH,
      },
      `/variety/${slug}/app/`,
      env.NEXT_PUBLIC_SITE_URL,
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
    const response = packageErrorResponse(error, 'Página no encontrada')

    if (response) return response

    throw error
  }
}

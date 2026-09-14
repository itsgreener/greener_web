import { NextRequest, NextResponse } from 'next/server'
import { getStoragePackage } from '@/modules/packages/infrastructure/supabaseStorageSource'
import { composeToolDocument } from '@/modules/packages/application/composeToolDocument'
import { PackageNotFoundError } from '@/modules/packages/domain/manifest'

/**
 * Sirve el HTML real de una tool bajo /tools/[slug]/app (especificacion-
 * final-formato-detalle.md §7): la ruta /tools/[slug] sin /app queda para
 * la página de detalle tipo A (portada, summary, CTA "Use") — todavía
 * sin construir, ver PROGRESO.md. Mismo origen que el resto del sitio,
 * sin iframe ni subdominio de ejecución (arquitectura §12.1, ADR-07).
 * Devuelve el documento COMPUESTO (menú lateral + contenido del
 * paquete) como respuesta HTML inicial, para que los <script> del
 * paquete se ejecuten de forma nativa.
 *
 * El ancho/alto disponibles se calculan aquí de forma fija por ahora
 * (arquitectura §12.3 — en producción se ajustará a la barra lateral real
 * y al viewport reportado). Fuente del paquete: Supabase Storage, la
 * versión publicada más reciente (§9 sep) — ya no fixtures/.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const pkg = await getStoragePackage('tool', slug)

    const sidebarWidth = 64
    const html = composeToolDocument(
      pkg,
      { width: 1200 - sidebarWidth, height: 800, sidebarWidth },
      `/tools/${slug}/app/`,
    )

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // CSP específico de la ruta (arquitectura §17.1): permite lo que
        // necesita esta tool (canvas es nativo del DOM, no requiere CSP;
        // worker-src 'self' y blob: cubren el Worker propio y la descarga).
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data:;",
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      return new NextResponse('Tool no encontrada', { status: 404 })
    }
    throw error
  }
}

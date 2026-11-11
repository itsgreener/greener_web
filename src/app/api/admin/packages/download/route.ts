import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { adminApiGuard } from '@/lib/auth/adminSession'

import { downloadHtmlPackageVersion } from '@/modules/packages/container'
import { PackageDownloadTooLargeError } from '@/modules/packages/domain/packageErrors'
import { formatMegabytes } from '@/modules/packages/domain/packageLimits'

const querySchema = z.object({
  content: z.uuid(),
  version: z.uuid(),
})

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * `GET /api/admin/packages/download?content=<uuid>&version=<uuid>`: descarga
 * una versión de un paquete (tool, insight o página satélite) como ZIP.
 *
 * Solo para admin (`adminApiGuard`). El navegador manda identificadores; la
 * ruta de Storage sale de la base de datos y se comprueba que la versión es de
 * ese contenido. El ZIP se reconstruye con los ficheros guardados (la web no
 * conserva el original), así que no es byte a byte el que se subió.
 *
 * Los errores son JSON `{ error }` (el botón del ABM los enseña tal cual).
 */
export async function GET(request: NextRequest) {
  const denied = await adminApiGuard()

  if (denied) return denied

  const params = querySchema.safeParse({
    content: request.nextUrl.searchParams.get('content'),
    version: request.nextUrl.searchParams.get('version'),
  })

  if (!params.success) {
    return NextResponse.json(
      { error: 'Parámetros no válidos.' },
      { status: 400, headers: NO_STORE },
    )
  }

  try {
    const result = await downloadHtmlPackageVersion({
      contentId: params.data.content,
      versionId: params.data.version,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'No se ha encontrado esa versión del paquete.' },
        { status: 404, headers: NO_STORE },
      )
    }

    return new NextResponse(new Uint8Array(result.zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(result.zip.byteLength),
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        ...NO_STORE,
      },
    })
  } catch (error) {
    if (error instanceof PackageDownloadTooLargeError) {
      return NextResponse.json(
        {
          error: `El ZIP reconstruido pesa ${formatMegabytes(error.bytes)} y la plataforma no deja descargar más de 4,4 MB de una vez. Los ficheros siguen en Storage.`,
        },
        { status: 413, headers: NO_STORE },
      )
    }

    console.error('Admin · descarga del paquete:', error)

    return NextResponse.json(
      { error: 'No se ha podido preparar el ZIP. Inténtalo de nuevo.' },
      { status: 503, headers: NO_STORE },
    )
  }
}

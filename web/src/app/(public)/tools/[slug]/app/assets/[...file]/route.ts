import { NextRequest, NextResponse } from 'next/server'
import { getStoragePackageAsset } from '@/modules/packages/infrastructure/supabaseStorageSource'
import { PackageNotFoundError } from '@/modules/packages/domain/manifest'

const CONTENT_TYPES: Record<string, string> = {
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  svg: 'image/svg+xml',
}

function contentTypeFor(filename: string): string {
  const ext = filename.split('.').pop() ?? ''
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

/**
 * Sirve los assets de una tool (CSS, JS, el Worker) bajo su propia ruta,
 * mismo origen (arquitectura §12.1). El Content-Type correcto es
 * imprescindible: un worker.js servido con MIME incorrecto no arranca en
 * la mayoría de navegadores.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; file: string[] }> },
) {
  const { slug, file } = await params

  try {
    const contents = await getStoragePackageAsset('tool', slug, file)
    const filename = file[file.length - 1] ?? ''

    return new NextResponse(new Uint8Array(contents), {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(filename),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      return new NextResponse('Asset no encontrado', { status: 404 })
    }
    throw error
  }
}

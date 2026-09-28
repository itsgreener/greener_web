import { NextRequest, NextResponse } from 'next/server'
import { getStoragePackageAsset } from '@/modules/packages/infrastructure/supabaseStorageSource'
import { buildAssetResponse } from '@/modules/packages/infrastructure/assetResponse'
import { PackageNotFoundError } from '@/modules/packages/domain/manifest'

/**
 * Sirve los assets de un insight (CSS, JS, el Worker) bajo su propia ruta,
 * mismo origen (arquitectura §12.1) — copia deliberada de la de
 * tools, la lógica común vive en `assetResponse.ts`.
 *
 * Caché: revalidación con ETag, NO "immutable" — la URL no lleva la
 * versión del paquete, ver `modules/packages/domain/assetCaching.ts`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; file: string[] }> },
) {
  const { slug, file } = await params

  try {
    const asset = await getStoragePackageAsset(
      'insight',
      slug,
      file,
      request.headers.get('if-none-match'),
    )

    return buildAssetResponse(asset, file[file.length - 1] ?? '')
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      return new NextResponse('Asset no encontrado', { status: 404 })
    }
    throw error
  }
}

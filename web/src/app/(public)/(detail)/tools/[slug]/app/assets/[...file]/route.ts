import { NextRequest } from 'next/server'
import { buildAssetResponse } from '@/lib/http/packageAssetResponse'
import { packageErrorResponse } from '@/lib/http/packageErrorResponse'
import { publishedPackages } from '@/modules/packages/container'

/**
 * Sirve los assets (CSS, JS, el Worker) de una tool bajo su propia ruta, mismo origen
 * (arquitectura §12.1). La lógica común vive en `packageAssetResponse.ts`.
 *
 * `file` es lo que va DESPUÉS de `/assets/` (Next consume ese segmento fijo),
 * pero en Storage el asset vive bajo `<storage_path>/assets/...`: de ahí el
 * `'assets'` que se antepone antes de pedirlo.
 *
 * Caché: revalidación con ETag, NO «immutable» — la URL no lleva la versión
 * del paquete (`modules/packages/domain/assetCaching.ts`).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; file: string[] }> },
) {
  const { slug, file } = await params

  try {
    const asset = await publishedPackages.getAsset(
      'tool',
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

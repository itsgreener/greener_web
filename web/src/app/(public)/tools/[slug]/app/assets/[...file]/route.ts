import { NextRequest, NextResponse } from 'next/server'
import { getStoragePackageAsset } from '@/modules/packages/infrastructure/supabaseStorageSource'
import { buildAssetResponse } from '@/modules/packages/infrastructure/assetResponse'
import { PackageNotFoundError } from '@/modules/packages/domain/manifest'

/**
 * Sirve los assets de una tool (CSS, JS, el Worker) bajo su propia ruta,
 * mismo origen (arquitectura §12.1) — copia deliberada de la de
 * insights, la lógica común vive en `assetResponse.ts`.
 *
 * `file` es la parte de la URL DESPUÉS de `/assets/` (Next.js ya consume
 * el segmento `assets` fijo de la ruta, no forma parte del catch-all),
 * pero en Storage el asset vive bajo `<storage_path>/assets/...` (todo el
 * contenido del paquete que no sea `index.html`/`manifest.json` se sube
 * conservando su ruta dentro del ZIP — `assets/main.js` en el ZIP acaba en
 * `<storage_path>/assets/main.js` en Storage, ver
 * `supabaseHtmlPackageRepository.uploadVersion`). Por eso hay que volver a
 * anteponer `'assets'` antes de consultar Storage — sin esto, **todo**
 * asset de **todo** paquete daba 404 contra Storage real (bug real,
 * presente desde antes de este comentario; detectado y corregido el 29
 * de septiembre, nunca lo cubrieron los tests porque mockean Storage).
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
      'tool',
      slug,
      ['assets', ...file],
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

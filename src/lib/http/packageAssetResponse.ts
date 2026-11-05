import { NextResponse } from 'next/server'

import {
  isActiveAsset,
  PACKAGE_ACTIVE_ASSET_CSP,
  PACKAGE_BASE_SECURITY_HEADERS,
} from '@/lib/http/packageSecurityHeaders'
import { ASSET_CACHE_CONTROL } from '@/modules/packages/domain/assetCaching'
import { contentTypeFor } from '@/modules/packages/domain/packageFiles'
import type { PackageAsset } from '@/modules/packages/domain/publishedPackageSource'

/**
 * Respuesta común de las rutas de assets (tools, insights y variety): 304 sin
 * cuerpo si el navegador ya tiene esta versión, 200 con el archivo si no.
 * En ambos casos lleva ETag y `Cache-Control: no-cache` (revalidar), y las
 * cabeceras de seguridad de `packageSecurityHeaders.ts`: estas rutas no pasan
 * por el proxy, así que `nosniff` y el resto hay que ponerlos aquí. Un
 * `.html`, `.htm` o `.svg` lleva además una CSP que le impide ejecutar nada
 * si alguien lo abre por su URL directa (SEC-PUB-B1).
 */
export function buildAssetResponse(
  asset: PackageAsset,
  filename: string,
): NextResponse {
  const headers: Record<string, string> = {
    ETag: asset.etag,
    'Cache-Control': ASSET_CACHE_CONTROL,
    ...PACKAGE_BASE_SECURITY_HEADERS,
  }

  if (isActiveAsset(filename)) {
    headers['Content-Security-Policy'] = PACKAGE_ACTIVE_ASSET_CSP
  }

  if (asset.notModified) {
    return new NextResponse(null, { status: 304, headers })
  }

  return new NextResponse(new Uint8Array(asset.data), {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': contentTypeFor(filename),
    },
  })
}

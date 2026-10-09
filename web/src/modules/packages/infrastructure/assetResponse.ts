import { NextResponse } from 'next/server'

import { ASSET_CACHE_CONTROL } from '../domain/assetCaching'
import { contentTypeFor } from '../domain/packageFiles'
import type { StoragePackageAsset } from './supabaseStorageSource'

/**
 * Respuesta común de las dos rutas de assets (tools e insights): 304 sin
 * cuerpo si el navegador ya tiene esta versión, 200 con el archivo si no.
 * En ambos casos lleva ETag y `Cache-Control: no-cache` (revalidar).
 */
export function buildAssetResponse(
  asset: StoragePackageAsset,
  filename: string,
): NextResponse {
  const headers = {
    ETag: asset.etag,
    'Cache-Control': ASSET_CACHE_CONTROL,
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
